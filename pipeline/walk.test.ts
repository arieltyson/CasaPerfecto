import { BASE_SPEED } from "../src/lib/graph.ts";
import { isWalkable } from "./osm.ts";
import { toblerSpeed } from "./walk.ts";

describe("toblerSpeed", () => {
  it("walks at the base speed on flat ground", () => {
    expect(toblerSpeed(0)).toBeCloseTo(BASE_SPEED, 6);
  });

  it("is fastest on a gentle downhill", () => {
    expect(toblerSpeed(-0.05)).toBeGreaterThan(toblerSpeed(0));
    expect(toblerSpeed(-0.05)).toBeGreaterThan(toblerSpeed(-0.1));
  });

  it("is slower uphill than down the same grade", () => {
    expect(toblerSpeed(0.15)).toBeLessThan(toblerSpeed(-0.15));
  });

  it("slows to under half the base speed on a 30% grade", () => {
    expect(toblerSpeed(0.3)).toBeLessThan(BASE_SPEED / 2);
  });
});

describe("isWalkable", () => {
  it("accepts streets and paths", () => {
    expect(isWalkable({ highway: "residential" })).toBe(true);
    expect(isWalkable({ highway: "steps" })).toBe(true);
  });

  it("rejects motorways and private or foot-banned ways", () => {
    expect(isWalkable({ highway: "motorway" })).toBe(false);
    expect(isWalkable({ highway: "service", access: "private" })).toBe(false);
    expect(isWalkable({ highway: "footway", foot: "no" })).toBe(false);
  });

  it("allows private ways that explicitly allow walking", () => {
    expect(
      isWalkable({ highway: "service", access: "private", foot: "yes" }),
    ).toBe(true);
  });
});
