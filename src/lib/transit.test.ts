import { type Edge, buildGraph, timeToSeeds } from "./graph.ts";
import {
  BOARDING,
  type TransitData,
  boardingTimes,
  expectedWait,
  transitTimes,
} from "./transit.ts";

// A straight street of 6 nodes, 100 s of walking between neighbors.
// Node 0 is work. A bus runs 5 -> 1 in 60 s with a 4-minute headway.
function street(): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < 5; i++) {
    edges.push({ from: i, to: i + 1, tenths: 1000 });
    edges.push({ from: i + 1, to: i, tenths: 1000 });
  }
  return edges;
}

const data: TransitData = {
  serviceDate: "2026-10-14",
  window: "06:00-10:00",
  stops: { node: [5, 1], name: ["Far", "Near"], lon: [0, 0], lat: [0, 0] },
  patterns: [
    {
      route: "1",
      headsign: "Work",
      headway: 240,
      stops: [0, 1],
      times: [0, 60],
    },
  ],
};

describe("expectedWait", () => {
  it("is half the headway, capped at 15 minutes", () => {
    expect(expectedWait(240)).toBe(120);
    expect(expectedWait(3600)).toBe(900);
  });
});

describe("boardingTimes", () => {
  it("adds the wait and ride to the alighting cost", () => {
    const alight = Float64Array.from([500, 100]);
    const board = boardingTimes(data, alight);
    expect(board[0]).toBe(120 + BOARDING + 60 + 100);
    expect(board[1]).toBe(Infinity);
  });
});

describe("transitTimes", () => {
  const graph = buildGraph(6, street());
  const walk = timeToSeeds(graph, [{ node: 0, seconds: 0 }]);

  it("uses the bus when it beats walking", () => {
    const best = transitTimes(graph, data, walk);
    // Walking from node 5 takes 500 s; the bus takes 120 + 60 + 60 + 100.
    expect(walk[5]).toBe(500);
    expect(best[5]).toBe(340);
  });

  it("keeps walking where it is faster", () => {
    const best = transitTimes(graph, data, walk);
    expect(best[1]).toBe(100);
    expect(best[2]).toBe(200);
  });

  it("never returns more than the walking time", () => {
    const best = transitTimes(graph, data, walk);
    for (let i = 0; i < 6; i++) expect(best[i]).toBeLessThanOrEqual(walk[i]!);
  });
});
