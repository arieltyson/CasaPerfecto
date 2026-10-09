// The precomputed study area: grid cells, their walking-graph nodes, and the
// safety aggregates. Built by `npm run pipeline` into public/data.
import type { Point } from "../app/model.ts";
import { type Grid, cellAt, cellCenter, meters } from "../lib/grid.ts";

export interface AreaData {
  asOf: string;
  grid: Grid;
  hoods: string[];
  windows: {
    incidentsFrom: string;
    incidentsTo: string;
    encampmentsFrom: string;
    encampmentsTo: string;
  };
  totals: { violent: number; property: number; encampment: number };
  /** Upper counts of bands 1 to 3 for each measure, for the legend. */
  limits: {
    violent: [number, number, number];
    property: [number, number, number];
    encampment: [number, number, number];
  };
  cells: {
    index: number[];
    node: number[];
    snap: number[];
    hood: number[];
    violent: number[];
    property: number[];
    encampment: number[];
    /** 0 = none reported, 1 to 4 = quartile among cells with reports. */
    violentBand: number[];
    propertyBand: number[];
    encampmentBand: number[];
    danger: number[];
  };
  outline: [number, number][][];
  /** Official Tenderloin boundary (DataSF Analysis Neighborhoods), as
   * MultiPolygon coordinates. Outlined on the map at all times. */
  tenderloin: [number, number][][][];
}

export interface Place {
  name: string;
  lon: number;
  lat: number;
  cell: number;
}

export const dataUrl = (file: string) =>
  `${import.meta.env.BASE_URL}data/${file}`;

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(dataUrl(file));
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  return (await res.json()) as T;
}

let areaPromise: Promise<AreaData> | null = null;
export function loadArea(): Promise<AreaData> {
  areaPromise ??= getJson<AreaData>("area.json").catch((error: unknown) => {
    areaPromise = null;
    throw error;
  });
  return areaPromise;
}

let placesPromise: Promise<Place[]> | null = null;
export function loadPlaces(): Promise<Place[]> {
  placesPromise ??= getJson<Place[]>("places.json").catch((error: unknown) => {
    placesPromise = null;
    throw error;
  });
  return placesPromise;
}

/** Position in `cells` of the cell holding a point, or of the nearest cell
 * within `maxMeters`; -1 when the point is outside the area. */
export function cellOfPoint(
  area: AreaData,
  point: Point,
  maxMeters = 250,
): number {
  const grid = cellAt(area.grid, point.lon, point.lat);
  const direct = area.cells.index.indexOf(grid);
  if (direct >= 0) return direct;
  let best = -1;
  let bestDist = maxMeters;
  area.cells.index.forEach((g, i) => {
    const [lon, lat] = cellCenter(area.grid, g);
    const d = meters(point, { lon, lat });
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export function cellPoint(area: AreaData, position: number): Point {
  const [lon, lat] = cellCenter(area.grid, area.cells.index[position]!);
  return { lon, lat };
}

/** Days between the data snapshot and today. */
export function dataAgeDays(asOf: string, now = new Date()): number {
  return Math.floor(
    (now.getTime() - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000,
  );
}

export const STALE_AFTER_DAYS = 21;
