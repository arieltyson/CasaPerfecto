import {
  type Edge,
  buildGraph,
  decodeGraph,
  encodeGraph,
  timeToSeeds,
} from "./graph.ts";

// 0 -> 1 -> 2 costs 10 s per step uphill; going down is 5 s per step.
const edges: Edge[] = [
  { from: 0, to: 1, tenths: 100 },
  { from: 1, to: 2, tenths: 100 },
  { from: 2, to: 1, tenths: 50 },
  { from: 1, to: 0, tenths: 50 },
  { from: 0, to: 3, tenths: 400 },
];

describe("walking graph", () => {
  const graph = buildGraph(4, edges);

  it("survives an encode and decode round trip", () => {
    const bytes = encodeGraph(graph);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const decoded = decodeGraph(copy.buffer);
    expect(decoded.nodeCount).toBe(4);
    expect([...decoded.offsets]).toEqual([...graph.offsets]);
    expect([...decoded.sources]).toEqual([...graph.sources]);
    expect([...decoded.costs]).toEqual([...graph.costs]);
  });

  it("rejects files that are not graphs", () => {
    expect(() => decodeGraph(new ArrayBuffer(16))).toThrow();
  });

  it("measures the walk toward the seed, not away from it", () => {
    const toTop = timeToSeeds(graph, [{ node: 2, seconds: 0 }]);
    expect([...toTop]).toEqual([20, 10, 0, Infinity]);
    const toBottom = timeToSeeds(graph, [{ node: 0, seconds: 0 }]);
    expect([...toBottom]).toEqual([0, 5, 10, Infinity]);
  });

  it("takes the best of several seeds including their head start", () => {
    const times = timeToSeeds(graph, [
      { node: 2, seconds: 0 },
      { node: 0, seconds: 3 },
    ]);
    expect([...times]).toEqual([3, 8, 0, Infinity]);
  });

  it("scales walking time by the speed factor", () => {
    const slow = timeToSeeds(graph, [{ node: 2, seconds: 0 }], 2);
    expect(slow[0]).toBe(40);
  });

  it("stops expanding past the time limit", () => {
    const capped = timeToSeeds(graph, [{ node: 2, seconds: 0 }], 1, 15);
    expect(capped[1]).toBe(10);
    expect(capped[0]).toBe(20);
  });
});

describe("timeToSeeds on a random graph", () => {
  it("matches Bellman-Ford shortest paths", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    const n = 400;
    const randomEdges: Edge[] = [];
    for (let i = 0; i < n * 3; i++) {
      const a = Math.floor(random() * n);
      const b = Math.floor(random() * n);
      randomEdges.push({ from: a, to: b, tenths: 1 + random() * 997 });
    }
    const g = buildGraph(n, randomEdges);
    const fast = timeToSeeds(g, [{ node: 0, seconds: 0 }]);

    const slow = new Float64Array(n).fill(Infinity);
    slow[0] = 0;
    for (let round = 0; round < n; round++) {
      let changed = false;
      for (const e of randomEdges) {
        const cost = Math.max(1, Math.round(e.tenths)) / 10;
        if (slow[e.to]! + cost < slow[e.from]!) {
          slow[e.from] = slow[e.to]! + cost;
          changed = true;
        }
      }
      if (!changed) break;
    }
    for (let i = 0; i < n; i++) {
      if (slow[i] === Infinity) expect(fast[i]).toBe(Infinity);
      else expect(fast[i]).toBeCloseTo(slow[i]!, 2);
    }
  });
});
