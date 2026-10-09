import { MAX_MUST_HAVES, STATE_VERSION, defaultState } from "./model.ts";
import { parseState } from "./parse.ts";
import { reducer } from "./reducer.ts";

describe("parseState", () => {
  it("returns defaults for anything that is not an object", () => {
    expect(parseState(null)).toEqual(defaultState());
    expect(parseState("garbage")).toEqual(defaultState());
    expect(parseState([1, 2])).toEqual(defaultState());
  });

  it("round-trips a valid state", () => {
    const state = reducer(defaultState(), {
      type: "setProfile",
      profile: { salary: 120_000 },
    });
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("clamps out-of-range numbers and drops invalid fields", () => {
    const parsed = parseState({
      commute: { maxMinutes: 500, mode: "teleport", speed: -3 },
      profile: { salary: -10, roommates: 9, unitType: "castle" },
      listings: [{ baseRent: "a lot", features: ["laundry", "moat"] }, 4],
    });
    expect(parsed.commute).toEqual({
      maxMinutes: 45,
      mode: "walk",
      speed: 0.5,
    });
    expect(parsed.profile.salary).toBeNull();
    expect(parsed.profile.roommates).toBe(3);
    expect(parsed.profile.roommateSalaries).toEqual([null, null, null]);
    expect(parsed.profile.unitType).toBe("1b1b");
    expect(parsed.listings).toHaveLength(1);
    expect(parsed.listings[0]?.baseRent).toBe(0);
    expect(parsed.listings[0]?.features).toEqual(["laundry"]);
  });

  it("keeps every feature exactly once in a stable order", () => {
    const parsed = parseState({
      preferences: [
        { feature: "gym", tier: "must", valuePerMonth: 40 },
        { feature: "gym", tier: "nice", valuePerMonth: 10 },
      ],
    });
    const features = parsed.preferences.map((p) => p.feature);
    expect(features).toEqual(defaultState().preferences.map((p) => p.feature));
    expect(parsed.preferences.find((p) => p.feature === "gym")).toEqual({
      feature: "gym",
      tier: "nice",
      valuePerMonth: 10,
    });
  });

  it("stamps the current version on older states", () => {
    expect(parseState({ version: 0 }).version).toBe(STATE_VERSION);
  });
});

describe("reducer", () => {
  it("refuses a sixth must-have", () => {
    let state = defaultState();
    for (const p of state.preferences.slice(0, MAX_MUST_HAVES + 1)) {
      state = reducer(state, {
        type: "setTier",
        feature: p.feature,
        tier: "must",
      });
    }
    const musts = state.preferences.filter((p) => p.tier === "must");
    expect(musts).toHaveLength(MAX_MUST_HAVES);
  });

  it("resizes roommate salaries when the roommate count changes", () => {
    let state = reducer(defaultState(), { type: "setRoommates", roommates: 2 });
    state = reducer(state, {
      type: "setRoommateSalary",
      index: 1,
      salary: 90_000,
    });
    expect(state.profile.roommateSalaries).toEqual([null, 90_000]);
    state = reducer(state, { type: "setRoommates", roommates: 1 });
    expect(state.profile.roommateSalaries).toEqual([null]);
  });

  it("adds a listing, then updates it in place", () => {
    const listing = { ...emptyListing(), id: "a", baseRent: 3000 };
    let state = reducer(defaultState(), { type: "saveListing", listing });
    state = reducer(state, {
      type: "saveListing",
      listing: { ...listing, baseRent: 3100 },
    });
    expect(state.listings).toHaveLength(1);
    expect(state.listings[0]?.baseRent).toBe(3100);
  });
});

function emptyListing() {
  return parseState({ listings: [{}] }).listings[0]!;
}
