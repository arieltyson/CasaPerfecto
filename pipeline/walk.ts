// Builds the walking graph and the study area from OpenStreetMap and terrain.
import {
  BASE_SPEED,
  type Edge,
  type Graph,
  buildGraph,
  timeToSeeds,
} from "../src/lib/graph.ts";
import { type Grid, cellCenter, makeGrid, meters } from "../src/lib/grid.ts";
import { AREA_SECONDS, CENTER, RADIUS_METERS, log } from "./lib.ts";
import type { OsmData } from "./osm.ts";
import type { Terrain } from "./terrain.ts";

// Paths between two points inside the area can leave it briefly, so the
// shipped graph keeps nodes up to this far from the center.
const KEEP_SECONDS = 70 * 60;
const SNAP_METERS = 120;
const FLAT_TOBLER = Math.exp(-3.5 * 0.05);

/**
 * Walking speed in m/s on a slope (rise over run), from Tobler's hiking
 * function, scaled so flat ground gives the base speed. Downhill at about 5%
 * is fastest; steep slopes in either direction are slower.
 */
export function toblerSpeed(slope: number): number {
  const s = Math.max(-0.6, Math.min(0.6, slope));
  return (BASE_SPEED * Math.exp(-3.5 * Math.abs(s + 0.05))) / FLAT_TOBLER;
}

export interface Network {
  graph: Graph;
  lon: Float64Array;
  lat: Float64Array;
  names: string[][];
  timeFromCenter: Float32Array;
}

export function buildNetwork(osm: OsmData, terrain: Terrain): Network {
  // Junctions: nodes shared by ways, plus every way's two ends.
  const uses = new Map<number, number>();
  for (const way of osm.ways) {
    for (const id of way.nodes) uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  const index = new Map<number, number>();
  const lons: number[] = [];
  const lats: number[] = [];
  const names: string[][] = [];
  function junction(id: number): number {
    let i = index.get(id);
    if (i === undefined) {
      const [lon, lat] = osm.coords.get(id)!;
      i = lons.length;
      index.set(id, i);
      lons.push(lon);
      lats.push(lat);
      names.push([]);
    }
    return i;
  }

  const elevation = new Map<number, number>();
  const elevOf = (id: number) => {
    let e = elevation.get(id);
    if (e === undefined) {
      const [lon, lat] = osm.coords.get(id)!;
      e = terrain.elevation(lon, lat);
      elevation.set(id, e);
    }
    return e;
  };

  const edges: Edge[] = [];
  for (const way of osm.ways) {
    const ids = way.nodes.filter((id) => osm.coords.has(id));
    if (ids.length < 2) continue;
    // Bridges and tunnels do not follow the ground, so use a constant grade
    // between their ends instead of the terrain under them.
    const level = way.tags["bridge"] || way.tags["tunnel"];
    let wayLength = 0;
    for (let i = 1; i < ids.length; i++) {
      wayLength += dist(osm, ids[i - 1]!, ids[i]!);
    }
    const levelSlope =
      level && wayLength > 0
        ? (elevOf(ids.at(-1)!) - elevOf(ids[0]!)) / wayLength
        : 0;

    const name = way.tags["name"];
    let start = junction(ids[0]!);
    if (name) names[start]!.push(name);
    let forward = 0;
    let backward = 0;
    for (let i = 1; i < ids.length; i++) {
      const a = ids[i - 1]!;
      const b = ids[i]!;
      const length = dist(osm, a, b);
      const slope = level
        ? levelSlope
        : length > 0
          ? (elevOf(b) - elevOf(a)) / length
          : 0;
      forward += length / toblerSpeed(slope);
      backward += length / toblerSpeed(-slope);
      const isJunction = i === ids.length - 1 || (uses.get(b) ?? 0) > 1;
      if (!isJunction) continue;
      const end = junction(b);
      if (name) names[end]!.push(name);
      if (end !== start) {
        edges.push({ from: start, to: end, tenths: forward * 10 });
        edges.push({ from: end, to: start, tenths: backward * 10 });
      }
      start = end;
      forward = 0;
      backward = 0;
    }
  }

  const all = buildGraph(lons.length, edges);
  // Snap the center to the main street network, not to an isolated path
  // inside a building or courtyard.
  const component = largestComponent(lons.length, edges);
  const center = nearestNode(lons, lats, CENTER.lon, CENTER.lat, (i) =>
    component.has(i),
  );
  const fromCenter = timeToSeeds(all, [{ node: center, seconds: 0 }]);

  // Keep only nodes within reach, renumbered densely.
  const keep = new Int32Array(lons.length).fill(-1);
  let kept = 0;
  for (let i = 0; i < lons.length; i++) {
    if (fromCenter[i]! <= KEEP_SECONDS) keep[i] = kept++;
  }
  const keptEdges = edges.flatMap((e) => {
    const from = keep[e.from]!;
    const to = keep[e.to]!;
    return from >= 0 && to >= 0 ? [{ from, to, tenths: e.tenths }] : [];
  });
  const lon = new Float64Array(kept);
  const lat = new Float64Array(kept);
  const keptNames: string[][] = [];
  const time = new Float32Array(kept);
  for (let i = 0; i < lons.length; i++) {
    const k = keep[i]!;
    if (k < 0) continue;
    lon[k] = lons[i]!;
    lat[k] = lats[i]!;
    keptNames[k] = [...new Set(names[i])];
    time[k] = fromCenter[i]!;
  }
  log(
    "walk",
    `${kept} of ${lons.length} junctions within ${KEEP_SECONDS / 60} min, ${keptEdges.length} edges`,
  );
  return {
    graph: buildGraph(kept, keptEdges),
    lon,
    lat,
    names: keptNames,
    timeFromCenter: time,
  };
}

function dist(osm: OsmData, a: number, b: number) {
  const [lonA, latA] = osm.coords.get(a)!;
  const [lonB, latB] = osm.coords.get(b)!;
  return meters({ lon: lonA, lat: latA }, { lon: lonB, lat: latB });
}

function largestComponent(nodeCount: number, edges: Edge[]): Set<number> {
  const parent = Int32Array.from({ length: nodeCount }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  for (const e of edges) parent[find(e.from)] = find(e.to);
  const sizes = new Map<number, number>();
  for (let i = 0; i < nodeCount; i++) {
    const root = find(i);
    sizes.set(root, (sizes.get(root) ?? 0) + 1);
  }
  const [biggest] = [...sizes].sort((a, b) => b[1] - a[1])[0]!;
  const members = new Set<number>();
  for (let i = 0; i < nodeCount; i++) if (find(i) === biggest) members.add(i);
  return members;
}

function nearestNode(
  lons: ArrayLike<number>,
  lats: ArrayLike<number>,
  lon: number,
  lat: number,
  accept: ((i: number) => boolean) | null,
) {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < lons.length; i++) {
    if (accept && !accept(i)) continue;
    const d = meters({ lon, lat }, { lon: lons[i]!, lat: lats[i]! });
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Spatial hash for nearest-node lookups at city scale. */
export class NodeIndex {
  private buckets = new Map<string, number[]>();
  private readonly size = 0.002;
  private network: Network;

  constructor(network: Network) {
    this.network = network;
    for (let i = 0; i < network.lon.length; i++) {
      const key = this.key(network.lon[i]!, network.lat[i]!);
      const list = this.buckets.get(key);
      if (list) list.push(i);
      else this.buckets.set(key, [i]);
    }
  }

  private key(lon: number, lat: number, dx = 0, dy = 0) {
    return `${Math.floor(lon / this.size) + dx},${Math.floor(lat / this.size) + dy}`;
  }

  nearest(lon: number, lat: number, maxMeters: number) {
    let best = -1;
    let bestDist = maxMeters;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const i of this.buckets.get(this.key(lon, lat, dx, dy)) ?? []) {
          const d = meters(
            { lon, lat },
            { lon: this.network.lon[i]!, lat: this.network.lat[i]! },
          );
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
      }
    }
    return best < 0 ? null : { node: best, meters: bestDist };
  }
}

export interface Cells {
  grid: Grid;
  /** Grid index of each cell in the area. */
  index: number[];
  /** Walking-graph node each cell snaps to. */
  node: number[];
  /** Straight-line meters from the cell center to that node. */
  snap: number[];
}

export function buildCells(network: Network, nodes: NodeIndex): Cells {
  const grid = makeGrid(CENTER, RADIUS_METERS);
  const cells: Cells = { grid, index: [], node: [], snap: [] };
  for (let i = 0; i < grid.cols * grid.rows; i++) {
    const [lon, lat] = cellCenter(grid, i);
    const hit = nodes.nearest(lon, lat, SNAP_METERS);
    if (!hit) continue;
    const seconds = network.timeFromCenter[hit.node]! + hit.meters / BASE_SPEED;
    if (seconds > AREA_SECONDS) continue;
    cells.index.push(i);
    cells.node.push(hit.node);
    cells.snap.push(Math.round(hit.meters));
  }
  log("walk", `${cells.index.length} cells within a 45-minute walk`);
  return cells;
}

/** Grid-edge segments between area cells and the outside, for the outline. */
export function outline(cells: Cells): [number, number][][] {
  const { grid } = cells;
  const inside = new Set(cells.index);
  const segments: [number, number][][] = [];
  for (const i of cells.index) {
    const col = i % grid.cols;
    const row = Math.floor(i / grid.cols);
    const w = grid.west + col * grid.dLon;
    const s = grid.south + row * grid.dLat;
    const e = w + grid.dLon;
    const n = s + grid.dLat;
    const round = (p: [number, number]): [number, number] => [
      Number(p[0].toFixed(6)),
      Number(p[1].toFixed(6)),
    ];
    if (row === 0 || !inside.has(i - grid.cols)) {
      segments.push([round([w, s]), round([e, s])]);
    }
    if (row === grid.rows - 1 || !inside.has(i + grid.cols)) {
      segments.push([round([w, n]), round([e, n])]);
    }
    if (col === 0 || !inside.has(i - 1)) {
      segments.push([round([w, s]), round([w, n])]);
    }
    if (col === grid.cols - 1 || !inside.has(i + 1)) {
      segments.push([round([e, s]), round([e, n])]);
    }
  }
  return segments;
}

export interface Place {
  name: string;
  lon: number;
  lat: number;
  cell: number;
}

/** Named street intersections inside the area, for search without geocoding. */
export function intersections(network: Network, cells: Cells): Place[] {
  const cellOfNode = new Map<number, number>();
  cells.node.forEach((node, c) => {
    if (!cellOfNode.has(node)) cellOfNode.set(node, c);
  });
  const { grid } = cells;
  const cellByGrid = new Map(cells.index.map((g, c) => [g, c]));
  const seen = new Set<string>();
  const places: Place[] = [];
  for (let i = 0; i < network.lon.length; i++) {
    const streets = network.names[i]!;
    if (streets.length < 2) continue;
    const name = [...streets].sort().slice(0, 2).join(" & ");
    if (seen.has(name)) continue;
    const lon = network.lon[i]!;
    const lat = network.lat[i]!;
    const col = Math.floor((lon - grid.west) / grid.dLon);
    const row = Math.floor((lat - grid.south) / grid.dLat);
    const cell = cellByGrid.get(row * grid.cols + col) ?? cellOfNode.get(i);
    if (cell === undefined) continue;
    seen.add(name);
    places.push({
      name,
      lon: Number(lon.toFixed(6)),
      lat: Number(lat.toFixed(6)),
      cell,
    });
  }
  places.sort((a, b) => a.name.localeCompare(b.name));
  log("walk", `${places.length} named intersections`);
  return places;
}
