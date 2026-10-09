// Walk + Muni travel time to work, computed backwards from the workplace.
//
// 1. Alighting at stop a costs T[a]: the walk from a to work.
// 2. Boarding a pattern at stop b costs the expected wait (half the headway)
//    plus the ride to the best later stop a plus T[a].
// 3. One walking search seeded at every boarding stop gives, for every node,
//    the best walk to some stop plus that stop's onward time.
// Feeding step 3's result back into step 1 adds one transfer.
import { type Graph, timeToSeeds } from "./graph.ts";

export interface TransitPattern {
  route: string;
  headsign: string;
  /** Seconds between departures in the morning window. */
  headway: number;
  stops: number[];
  /** Seconds from the first stop to each stop. */
  times: number[];
}

export interface TransitData {
  serviceDate: string;
  window: string;
  stops: { node: number[]; name: string[]; lon: number[]; lat: number[] };
  patterns: TransitPattern[];
}

// Waits longer than this are treated as "check the schedule", not modeled.
export const MAX_WAIT = 15 * 60;
// Time to reach the platform and board, beyond the walk itself.
export const BOARDING = 60;
export const ROUNDS = 2;

export function expectedWait(headway: number): number {
  return Math.min(MAX_WAIT, headway / 2);
}

/** Best seconds from boarding each stop to work, given alighting costs. */
export function boardingTimes(
  data: TransitData,
  alight: Float64Array,
): Float64Array {
  const board = new Float64Array(data.stops.node.length).fill(Infinity);
  for (const p of data.patterns) {
    const wait = expectedWait(p.headway) + BOARDING;
    let bestLater = Infinity;
    for (let i = p.stops.length - 1; i >= 0; i--) {
      const stop = p.stops[i]!;
      const t = p.times[i]!;
      if (bestLater < Infinity) {
        const total = wait + bestLater - t;
        if (total < board[stop]!) board[stop] = total;
      }
      const arrive = t + alight[stop]!;
      if (arrive < bestLater) bestLater = arrive;
    }
  }
  return board;
}

/**
 * Seconds from every node to work by walking, riding Muni, or both.
 * `walk` is the walking-only result for the same workplace.
 */
export function transitTimes(
  graph: Graph,
  data: TransitData,
  walk: Float32Array,
  speedFactor = 1,
): Float32Array {
  const stopNodes = data.stops.node;
  const alight = Float64Array.from(stopNodes, (n) => walk[n]!);
  let reach: Float32Array = walk;
  for (let round = 0; round < ROUNDS; round++) {
    const board = boardingTimes(data, alight);
    const seeds = [];
    for (let s = 0; s < stopNodes.length; s++) {
      if (board[s]! < Infinity)
        seeds.push({ node: stopNodes[s]!, seconds: board[s]! });
    }
    reach = timeToSeeds(graph, seeds, speedFactor);
    for (let s = 0; s < stopNodes.length; s++) {
      const viaTransfer = reach[stopNodes[s]!]!;
      if (viaTransfer < alight[s]!) alight[s] = viaTransfer;
    }
  }
  const best = new Float32Array(walk.length);
  for (let i = 0; i < walk.length; i++) {
    best[i] = Math.min(walk[i]!, reach[i]!);
  }
  return best;
}
