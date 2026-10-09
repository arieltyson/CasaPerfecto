// Compact walking graph shared by the data pipeline and the browser.
//
// Edges are stored as incoming adjacency (compressed sparse rows): for node v,
// edges offsets[v] .. offsets[v + 1] - 1 run from sources[e] to v and take
// costs[e] tenths of a second at the base walking speed. Storing incoming
// edges lets one search from the workplace answer "how long from here to
// work" for every node at once, which matters on hills where the walk there
// and the walk back take different times.

export const BASE_SPEED = 1.3;
const MAGIC = 0x31475043; // "CPG1"

export interface Graph {
  nodeCount: number;
  offsets: Uint32Array;
  sources: Uint32Array;
  costs: Uint16Array;
}

export interface Edge {
  from: number;
  to: number;
  tenths: number;
}

export function buildGraph(nodeCount: number, edges: Edge[]): Graph {
  const offsets = new Uint32Array(nodeCount + 1);
  for (const e of edges) offsets[e.to + 1]! += 1;
  for (let i = 0; i < nodeCount; i++) offsets[i + 1]! += offsets[i]!;
  const cursor = offsets.slice(0, nodeCount);
  const sources = new Uint32Array(edges.length);
  const costs = new Uint16Array(edges.length);
  for (const e of edges) {
    const at = cursor[e.to]!++;
    sources[at] = e.from;
    costs[at] = Math.min(65535, Math.max(1, Math.round(e.tenths)));
  }
  return { nodeCount, offsets, sources, costs };
}

export function encodeGraph(graph: Graph): Uint8Array {
  const edgeCount = graph.sources.length;
  const costBytes = Math.ceil((edgeCount * 2) / 4) * 4;
  const size = 12 + (graph.nodeCount + 1) * 4 + edgeCount * 4 + costBytes;
  const buffer = new ArrayBuffer(size);
  const head = new Uint32Array(buffer, 0, 3);
  head.set([MAGIC, graph.nodeCount, edgeCount]);
  let at = 12;
  new Uint32Array(buffer, at, graph.nodeCount + 1).set(graph.offsets);
  at += (graph.nodeCount + 1) * 4;
  new Uint32Array(buffer, at, edgeCount).set(graph.sources);
  at += edgeCount * 4;
  new Uint16Array(buffer, at, edgeCount).set(graph.costs);
  return new Uint8Array(buffer);
}

export function decodeGraph(buffer: ArrayBuffer): Graph {
  const [magic, nodeCount, edgeCount] = new Uint32Array(buffer, 0, 3);
  if (magic !== MAGIC || nodeCount === undefined || edgeCount === undefined) {
    throw new Error("Not a CasaPerfecto graph file.");
  }
  let at = 12;
  const offsets = new Uint32Array(buffer, at, nodeCount + 1);
  at += (nodeCount + 1) * 4;
  const sources = new Uint32Array(buffer, at, edgeCount);
  at += edgeCount * 4;
  const costs = new Uint16Array(buffer, at, edgeCount);
  return { nodeCount, offsets, sources, costs };
}

// Min-heap keyed by seconds, storing node ids. Stale entries are skipped by
// the caller instead of being decreased in place.
class Heap {
  private keys = new Float64Array(1024);
  private values = new Uint32Array(1024);
  size = 0;

  push(key: number, value: number) {
    if (this.size === this.keys.length) {
      const keys = new Float64Array(this.size * 2);
      const values = new Uint32Array(this.size * 2);
      keys.set(this.keys);
      values.set(this.values);
      this.keys = keys;
      this.values = values;
    }
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent]! <= key) break;
      this.keys[i] = this.keys[parent]!;
      this.values[i] = this.values[parent]!;
      i = parent;
    }
    this.keys[i] = key;
    this.values[i] = value;
  }

  // Returns the node with the smallest key; read `lastKey` for its key.
  lastKey = 0;
  pop(): number {
    const top = this.values[0]!;
    this.lastKey = this.keys[0]!;
    const key = this.keys[--this.size]!;
    const value = this.values[this.size]!;
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= this.size) break;
      if (child + 1 < this.size && this.keys[child + 1]! < this.keys[child]!) {
        child += 1;
      }
      if (this.keys[child]! >= key) break;
      this.keys[i] = this.keys[child]!;
      this.values[i] = this.values[child]!;
      i = child;
    }
    this.keys[i] = key;
    this.values[i] = value;
    return top;
  }
}

export interface Seed {
  node: number;
  seconds: number;
}

/**
 * Seconds from every node to the nearest seed, where reaching seed s costs
 * its own `seconds` on top of the walk. With one seed at the workplace this is
 * the walking time to work; with seeds at transit stops it is the best walk
 * to a stop plus the time from that stop onward.
 *
 * `speedFactor` scales walking time: 1.3 / speed for a slower or faster
 * walker than the base speed. Unreached nodes stay at Infinity.
 */
export function timeToSeeds(
  graph: Graph,
  seeds: readonly Seed[],
  speedFactor = 1,
  maxSeconds = Infinity,
): Float32Array {
  // Labels are kept in double precision: comparing a heap key against a
  // value rounded to float32 would wrongly discard live entries as stale.
  const dist = new Float64Array(graph.nodeCount).fill(Infinity);
  const heap = new Heap();
  for (const seed of seeds) {
    if (seed.seconds < dist[seed.node]!) {
      dist[seed.node] = seed.seconds;
      heap.push(seed.seconds, seed.node);
    }
  }
  const { offsets, sources, costs } = graph;
  const scale = speedFactor / 10;
  while (heap.size > 0) {
    const v = heap.pop();
    const d = heap.lastKey;
    if (d > dist[v]!) continue;
    if (d > maxSeconds) break;
    for (let e = offsets[v]!, end = offsets[v + 1]!; e < end; e++) {
      const u = sources[e]!;
      const next = d + costs[e]! * scale;
      if (next < dist[u]!) {
        dist[u] = next;
        heap.push(next, u);
      }
    }
  }
  return Float32Array.from(dist);
}
