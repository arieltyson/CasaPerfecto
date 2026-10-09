import type { AreaData } from "../data/area.ts";
import { band, reachableCount, summarize } from "./areas.ts";

const area: AreaData = {
  asOf: "2026-10-09",
  grid: { west: 0, south: 0, dLon: 1, dLat: 1, cols: 4, rows: 1 },
  hoods: ["North", "South"],
  windows: {
    incidentsFrom: "",
    incidentsTo: "",
    encampmentsFrom: "",
    encampmentsTo: "",
  },
  totals: { violent: 0, property: 0, encampment: 0 },
  limits: { violent: [1, 2, 3], property: [1, 2, 3], encampment: [1, 2, 3] },
  cells: {
    index: [0, 1, 2, 3],
    node: [0, 1, 2, 3],
    snap: [0, 0, 0, 0],
    hood: [0, 0, 1, 1],
    violent: [0, 2, 8, 9],
    property: [1, 1, 1, 1],
    encampment: [0, 0, 3, 0],
    violentBand: [0, 1, 4, 4],
    propertyBand: [1, 1, 1, 1],
    encampmentBand: [0, 0, 3, 0],
    danger: [0, 0, 1, 1],
  },
  outline: [],
  tenderloin: [],
};

describe("band", () => {
  it("splits the limit into five equal bands, shortest highest", () => {
    expect(band(0, 20)).toBe(5);
    expect(band(3.9, 20)).toBe(5);
    expect(band(4, 20)).toBe(5);
    expect(band(4.1, 20)).toBe(4);
    expect(band(20, 20)).toBe(1);
    expect(band(20.1, 20)).toBe(0);
    expect(band(Infinity, 20)).toBe(0);
  });
});

describe("summarize", () => {
  const walk = Float32Array.from([5, 15, 25, 35]);

  it("groups cells by neighborhood with walk ranges", () => {
    const [north, south] = summarize(area, walk, null, 20);
    expect(north).toMatchObject({
      name: "North",
      cells: 2,
      reachable: 2,
      minWalk: 5,
      medianWalk: 10,
      minTransit: null,
      violent: 2,
      dangerCells: 0,
    });
    expect(south).toMatchObject({
      name: "South",
      reachable: 0,
      dangerCells: 2,
    });
  });

  it("counts cells Muni brings within the limit", () => {
    const transit = Float32Array.from([5, 12, 18, 30]);
    const [, south] = summarize(area, walk, transit, 20);
    expect(south?.reachable).toBe(1);
    expect(south?.minTransit).toBe(18);
    expect(reachableCount(walk, transit, 20)).toBe(3);
  });
});
