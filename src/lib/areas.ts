// Per-neighborhood summaries for the Area List, the text equivalent of the map.
import type { AreaData } from "../data/area.ts";
import { cellCenter } from "./grid.ts";

export interface HoodSummary {
  name: string;
  cells: number;
  /** Cells within the commute limit by the chosen mode. */
  reachable: number;
  /** Shortest and median walk to work, in minutes. */
  minWalk: number;
  medianWalk: number;
  /** Shortest walk + Muni time, or null when Muni is off. */
  minTransit: number | null;
  /** Reported in the neighborhood's cells over each data window. */
  violent: number;
  property: number;
  encampment: number;
  dangerCells: number;
  center: [number, number];
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = values.toSorted((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function summarize(
  area: AreaData,
  walk: Float32Array,
  transit: Float32Array | null,
  maxMinutes: number,
): HoodSummary[] {
  const groups = new Map<number, number[]>();
  area.cells.hood.forEach((h, i) => {
    const list = groups.get(h) ?? [];
    list.push(i);
    groups.set(h, list);
  });
  const best = (i: number) => Math.min(walk[i]!, transit?.[i] ?? Infinity);
  const c = area.cells;
  return [...groups].map(([hood, members]) => {
    const walks = members.map((i) => walk[i]!).filter(Number.isFinite);
    const lons = members.map((i) => cellCenter(area.grid, c.index[i]!)[0]);
    const lats = members.map((i) => cellCenter(area.grid, c.index[i]!)[1]);
    return {
      name: area.hoods[hood] ?? "Unknown",
      cells: members.length,
      reachable: members.filter((i) => best(i) <= maxMinutes).length,
      minWalk: Math.min(...walks),
      medianWalk: median(walks),
      minTransit: transit ? Math.min(...members.map((i) => transit[i]!)) : null,
      violent: sum(members.map((i) => c.violent[i]!)),
      property: sum(members.map((i) => c.property[i]!)),
      encampment: sum(members.map((i) => c.encampment[i]!)),
      dangerCells: members.filter((i) => c.danger[i] === 1).length,
      center: [median(lons), median(lats)],
    };
  });
}

/** Total cells within the limit by the chosen mode. */
export function reachableCount(
  walk: Float32Array,
  transit: Float32Array | null,
  maxMinutes: number,
): number {
  let n = 0;
  for (let i = 0; i < walk.length; i++) {
    if (Math.min(walk[i]!, transit?.[i] ?? Infinity) <= maxMinutes) n++;
  }
  return n;
}

/** Five equal bands up to the limit: 5 is the shortest, 0 is over it. */
export function band(minutes: number, maxMinutes: number): number {
  if (!(minutes <= maxMinutes)) return 0;
  const step = maxMinutes / 5;
  return 6 - Math.max(1, Math.ceil(minutes / step));
}
