// The study area is divided into square cells of about 100 m. Cell geometry is
// derived from the grid parameters, so the data files only carry per-cell
// values and the browser builds the polygons itself.

export interface Grid {
  west: number;
  south: number;
  dLon: number;
  dLat: number;
  cols: number;
  rows: number;
}

export const CELL_METERS = 100;
const METERS_PER_DEGREE_LAT = 111_320;

export function makeGrid(
  center: { lon: number; lat: number },
  radiusMeters: number,
): Grid {
  const dLat = CELL_METERS / METERS_PER_DEGREE_LAT;
  const dLon =
    CELL_METERS /
    (METERS_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180));
  const half = Math.ceil(radiusMeters / CELL_METERS);
  return {
    west: center.lon - half * dLon,
    south: center.lat - half * dLat,
    dLon,
    dLat,
    cols: half * 2,
    rows: half * 2,
  };
}

/** Grid index (row * cols + col) of the cell holding a point, or -1. */
export function cellAt(grid: Grid, lon: number, lat: number): number {
  const col = Math.floor((lon - grid.west) / grid.dLon);
  const row = Math.floor((lat - grid.south) / grid.dLat);
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return -1;
  return row * grid.cols + col;
}

export function cellCenter(grid: Grid, index: number): [number, number] {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  return [
    grid.west + (col + 0.5) * grid.dLon,
    grid.south + (row + 0.5) * grid.dLat,
  ];
}

export function cellRing(grid: Grid, index: number): [number, number][] {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  const w = grid.west + col * grid.dLon;
  const s = grid.south + row * grid.dLat;
  const e = w + grid.dLon;
  const n = s + grid.dLat;
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

/** Approximate ground distance in meters, accurate at city scale. */
export function meters(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number },
): number {
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dx = (a.lon - b.lon) * k * METERS_PER_DEGREE_LAT;
  const dy = (a.lat - b.lat) * METERS_PER_DEGREE_LAT;
  return Math.hypot(dx, dy);
}
