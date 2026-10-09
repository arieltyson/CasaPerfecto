// Official neighborhood boundaries from DataSF (Analysis Neighborhoods,
// public domain). The Tenderloin is outlined permanently on the map.
import { cached, fetchBytes, log } from "./lib.ts";

const DATASET = "https://data.sf.gov/resource/j2bu-swwd.json";

const round = (n: number) => Number(n.toFixed(6));

export type Rings = [number, number][][][];

export async function loadNeighborhood(
  name: string,
  refresh: boolean,
): Promise<Rings> {
  const url = new URL(DATASET);
  url.searchParams.set("nhood", name);
  const bytes = await cached(
    `neighborhood-${name.toLowerCase().replaceAll(/\W+/g, "-")}.json`,
    () => fetchBytes(url.toString()),
    refresh,
  );
  const rows = JSON.parse(new TextDecoder().decode(bytes)) as {
    the_geom?: { type: string; coordinates: Rings };
  }[];
  const geom = rows[0]?.the_geom;
  if (!geom || geom.type !== "MultiPolygon") {
    throw new Error(`No boundary for ${name} in Analysis Neighborhoods.`);
  }
  log("neighborhoods", `${name}: ${geom.coordinates.length} polygon(s)`);
  return geom.coordinates.map((polygon) =>
    polygon.map((ring) => ring.map(([x, y]) => [round(x), round(y)])),
  );
}
