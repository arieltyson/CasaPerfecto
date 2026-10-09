import { type Listing, type Profile, defaultState } from "../app/model.ts";
import { parseState } from "../app/parse.ts";
import {
  adjustedCost,
  allInMonthly,
  ceilings,
  householdIncome,
  mustHaves,
  rankListings,
  residual,
  salaryNeeded,
  standing,
} from "./budget.ts";

const profile = (over: Partial<Profile> = {}): Profile => ({
  ...defaultState().profile,
  utilities: 0,
  ...over,
});

const listing = (over: Partial<Listing>): Listing => ({
  ...parseState({ listings: [{}] }).listings[0]!,
  ...over,
});

describe("ceilings", () => {
  it("is 30% of gross monthly pay for one person", () => {
    const c = ceilings(profile({ salary: 100_000 }))!;
    expect(c.perPerson.standard).toBeCloseTo(2500, 6);
    expect(c.perPerson.conservative).toBeCloseTo(2083.33, 2);
    expect(c.perPerson.severe).toBeCloseTo(4166.67, 2);
  });

  it("subtracts each person's share of utilities", () => {
    const c = ceilings(
      profile({
        salary: 100_000,
        roommates: 1,
        roommateSalaries: [null],
        utilities: 200,
      }),
    )!;
    expect(c.perPerson.standard).toBeCloseTo(2400, 6);
    expect(c.combined.standard).toBeCloseTo(4800, 6);
  });

  it("uses roommates' own salaries when entered", () => {
    const p = profile({
      salary: 100_000,
      roommates: 1,
      roommateSalaries: [60_000],
    });
    expect(householdIncome(p)).toBe(160_000);
    expect(ceilings(p)!.combined.standard).toBeCloseTo(4000, 6);
  });

  it("is unknown without a salary", () => {
    expect(ceilings(profile())).toBeNull();
  });
});

describe("salaryNeeded", () => {
  it("matches the published worked examples", () => {
    expect(salaryNeeded(2700)).toBe(108_000);
    expect(salaryNeeded(4295)).toBe(171_800);
    expect(salaryNeeded(6235 / 2)).toBe(124_700);
  });
});

describe("standing", () => {
  it("separates within, near and over the 30% line", () => {
    expect(standing(2500, 100_000)).toBe("within");
    expect(standing(2700, 100_000)).toBe("near");
    expect(standing(3000, 100_000)).toBe("over");
    expect(standing(3000, null)).toBe("unknown");
  });

  it("reports what is left after rent", () => {
    expect(residual(2500, 120_000)).toBe(7500);
  });
});

describe("listing costs", () => {
  const prefs = defaultState().preferences.map((p) =>
    p.feature === "laundry"
      ? { ...p, tier: "nice" as const, valuePerMonth: 150 }
      : p.feature === "pets"
        ? { ...p, tier: "must" as const }
        : p,
  );

  it("spreads a concession over a 12-month lease", () => {
    const l = listing({
      baseRent: 3000,
      utilities: 150,
      parking: 200,
      fees: 50,
      concession: 3000,
    });
    expect(allInMonthly(l)).toBe(3150);
  });

  it("subtracts the value of included nice-to-haves", () => {
    const l = listing({ baseRent: 3000, features: ["laundry"] });
    expect(adjustedCost(l, prefs)).toBe(2850);
  });

  it("lists missing must-haves", () => {
    expect(mustHaves(listing({ features: [] }), prefs).missing).toEqual([
      "pets",
    ]);
    expect(mustHaves(listing({ features: ["pets"] }), prefs).missing).toEqual(
      [],
    );
  });

  it("ranks listings that meet every must-have first, then by cost", () => {
    const a = listing({ id: "a", baseRent: 2500, features: [] });
    const b = listing({ id: "b", baseRent: 3200, features: ["pets"] });
    const c = listing({
      id: "c",
      baseRent: 3000,
      features: ["pets", "laundry"],
    });
    const ranked = rankListings(
      [a, b, c],
      profile({ salary: 120_000 }),
      prefs,
      () => null,
    );
    expect(ranked.map((r) => r.listing.id)).toEqual(["c", "b", "a"]);
  });
});
