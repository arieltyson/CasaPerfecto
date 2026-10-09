// Reported incidents (SFPD) and 311 encampment reports from DataSF, counted per
// cell and ranked within the study area.
import { cellAt } from "../src/lib/grid.ts";
import { bbox, cached, fetchBytes, isoDate, log } from "./lib.ts";
import type { Cells } from "./walk.ts";

const DATASF = "https://data.sf.gov/resource";
const PAGE = 50_000;

// SFPD incident_category values, grouped. Each incident number counts once
// per group even when its report lists several offense codes.
export const VIOLENT = new Set([
  "Assault",
  "Robbery",
  "Homicide",
  "Rape",
  "Sex Offense",
  "Human Trafficking (A), Commercial Sex Acts",
  "Human Trafficking (B), Involuntary Servitude",
  "Human Trafficking, Commercial Sex Acts",
]);
export const PROPERTY = new Set([
  "Larceny Theft",
  "Burglary",
  "Motor Vehicle Theft",
  "Motor Vehicle Theft?",
  "Malicious Mischief",
  "Vandalism",
  "Arson",
]);

type Row = Record<string, string | undefined>;

async function query(
  dataset: string,
  params: Record<string, string>,
  cacheName: string,
  refresh: boolean,
): Promise<Row[]> {
  const bytes = await cached(
    cacheName,
    async () => {
      const rows: Row[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const url = new URL(`${DATASF}/${dataset}.json`);
        for (const [k, v] of Object.entries({
          ...params,
          $limit: String(PAGE),
          $offset: String(offset),
          $order: ":id",
        })) {
          url.searchParams.set(k, v);
        }
        const token = process.env["SOCRATA_APP_TOKEN"];
        const page = JSON.parse(
          new TextDecoder().decode(
            await fetchBytes(
              url.toString(),
              token ? { headers: { "X-App-Token": token } } : {},
            ),
          ),
        ) as Row[];
        rows.push(...page);
        if (page.length < PAGE) break;
      }
      return new TextEncoder().encode(JSON.stringify(rows));
    },
    refresh,
  );
  return JSON.parse(new TextDecoder().decode(bytes)) as Row[];
}

export interface Banding {
  /** Band per cell: 0 when none were reported, then 1 to 4 by quartile of
   * the cells that had at least one report. */
  bands: number[];
  /** Upper count of bands 1, 2 and 3; band 4 is everything above. */
  limits: [number, number, number];
}

/** Bands counts as "none reported" plus quartiles of the nonzero cells, so
 * the many cells with no reports do not crowd the scale. */
export function quartileBands(values: number[]): Banding {
  const nonzero = values.filter((v) => v > 0).toSorted((a, b) => a - b);
  const at = (q: number) =>
    nonzero[Math.min(nonzero.length - 1, Math.floor(nonzero.length * q))] ?? 0;
  const limits: [number, number, number] = [at(0.25), at(0.5), at(0.75)];
  const bands = values.map((v) =>
    v === 0 ? 0 : 1 + limits.filter((limit) => v > limit).length,
  );
  return { bands, limits };
}

export interface Safety {
  violent: number[];
  property: number[];
  encampment: number[];
  violentBand: Banding;
  propertyBand: Banding;
  encampmentBand: Banding;
  danger: number[];
  hood: number[];
  hoods: string[];
  windows: {
    incidentsFrom: string;
    incidentsTo: string;
    encampmentsFrom: string;
    encampmentsTo: string;
  };
  totals: { violent: number; property: number; encampment: number };
}

export async function buildSafety(
  cells: Cells,
  refresh: boolean,
): Promise<Safety> {
  const area = bbox();
  const box = `within_box(point,${area.north},${area.west},${area.south},${area.east})`;
  const now = new Date();
  const yearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const quarterAgo = new Date(now.getTime() - 90 * 86_400_000);

  const incidents = await query(
    "wg3w-h783",
    {
      $select:
        "incident_number,incident_category,latitude,longitude,analysis_neighborhood",
      $where: `incident_datetime >= '${isoDate(yearAgo)}' AND ${box}`,
    },
    "incidents.json",
    refresh,
  );
  const encampments = await query(
    "vw6y-z8j6",
    {
      $select: "service_request_id,lat,long,analysis_neighborhood",
      $where: `service_name = 'Encampment' AND requested_datetime >= '${isoDate(quarterAgo)}' AND ${box}`,
    },
    "encampments.json",
    refresh,
  );
  log(
    "safety",
    `${incidents.length} incident rows, ${encampments.length} encampment reports`,
  );

  const position = new Map(cells.index.map((g, c) => [g, c]));
  const n = cells.index.length;
  const violent = Array.from({ length: n }, () => 0);
  const property = Array.from({ length: n }, () => 0);
  const encampment = Array.from({ length: n }, () => 0);
  const hoodVotes = Array.from({ length: n }, () => new Map<string, number>());

  const locate = (lon?: string, lat?: string) => {
    if (!lon || !lat) return -1;
    return position.get(cellAt(cells.grid, Number(lon), Number(lat))) ?? -1;
  };
  const vote = (cell: number, hood?: string) => {
    if (cell < 0 || !hood) return;
    const votes = hoodVotes[cell]!;
    votes.set(hood, (votes.get(hood) ?? 0) + 1);
  };

  const seen = new Set<string>();
  for (const row of incidents) {
    const cell = locate(row["longitude"], row["latitude"]);
    vote(cell, row["analysis_neighborhood"]);
    const category = row["incident_category"] ?? "";
    const group = VIOLENT.has(category)
      ? "v"
      : PROPERTY.has(category)
        ? "p"
        : null;
    if (cell < 0 || !group) continue;
    const key = `${row["incident_number"]}:${group}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (group === "v") violent[cell]! += 1;
    else property[cell]! += 1;
  }
  for (const row of encampments) {
    const cell = locate(row["long"], row["lat"]);
    vote(cell, row["analysis_neighborhood"]);
    if (cell >= 0) encampment[cell]! += 1;
  }

  // Neighborhood names: the most common label among records in the cell,
  // then filled outward to cells with no records.
  const hoods: string[] = [];
  const hoodIndex = new Map<string, number>();
  const hood = hoodVotes.map((votes) => {
    const best = [...votes].toSorted((a, b) => b[1] - a[1])[0]?.[0];
    if (!best) return -1;
    if (!hoodIndex.has(best)) {
      hoodIndex.set(best, hoods.length);
      hoods.push(best);
    }
    return hoodIndex.get(best)!;
  });
  fillHoods(cells, hood);

  const threshold = violent.toSorted((a, b) => a - b)[Math.floor(n * 0.9)]!;
  const danger = violent.map((v) => (v > 0 && v >= threshold ? 1 : 0));
  log(
    "safety",
    `danger threshold ${threshold} violent incidents, ${danger.filter(Boolean).length} cells, ${hoods.length} neighborhoods`,
  );

  return {
    violent,
    property,
    encampment,
    violentBand: quartileBands(violent),
    propertyBand: quartileBands(property),
    encampmentBand: quartileBands(encampment),
    danger,
    hood,
    hoods,
    windows: {
      incidentsFrom: isoDate(yearAgo),
      incidentsTo: isoDate(now),
      encampmentsFrom: isoDate(quarterAgo),
      encampmentsTo: isoDate(now),
    },
    totals: {
      violent: violent.reduce((a, b) => a + b, 0),
      property: property.reduce((a, b) => a + b, 0),
      encampment: encampment.reduce((a, b) => a + b, 0),
    },
  };
}

function fillHoods(cells: Cells, hood: number[]) {
  const { grid } = cells;
  const position = new Map(cells.index.map((g, c) => [g, c]));
  let queue = hood.flatMap((h, c) => (h >= 0 ? [c] : []));
  while (queue.length > 0) {
    const next: number[] = [];
    for (const c of queue) {
      const g = cells.index[c]!;
      for (const d of [-1, 1, -grid.cols, grid.cols]) {
        const neighbor = position.get(g + d);
        if (neighbor !== undefined && hood[neighbor] === -1) {
          hood[neighbor] = hood[c]!;
          next.push(neighbor);
        }
      }
    }
    queue = next;
  }
}
