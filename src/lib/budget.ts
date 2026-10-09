// Affordability and listing math. Pure functions with no UI or storage.
//
// HUD treats a renter household as cost burdened above 30% of gross income
// on rent plus utilities, and severely cost burdened above 50%. 25% is shown
// as a conservative target. The residual (what is left after housing) is
// shown beside the ratios because the ratio alone ignores taxes and other
// necessities (Stone, 2006).
import type { FeatureId, Listing, Preference, Profile } from "../app/model.ts";

export const SHARES = { conservative: 0.25, standard: 0.3, severe: 0.5 };
/** Within this much over the 30% ceiling a cost reads as "near" it. */
export const NEAR_MARGIN = 0.1;

export type Standing = "within" | "near" | "over" | "unknown";

export const monthly = (annual: number) => annual / 12;

export function people(profile: Profile): number {
  return profile.roommates + 1;
}

/**
 * Gross annual income of everyone sharing. A roommate without an entered
 * salary is assumed to match the renter's, which the UI states.
 */
export function householdIncome(profile: Profile): number | null {
  if (profile.salary === null) return null;
  const own = profile.salary;
  return profile.roommateSalaries.reduce<number>(
    (sum, s) => sum + (s ?? own),
    own,
  );
}

export interface Ceilings {
  /** Monthly rent the renter alone can pay at each share, after utilities. */
  perPerson: { conservative: number; standard: number; severe: number };
  /** Monthly rent the whole household can pay at each share. */
  combined: { conservative: number; standard: number; severe: number };
}

const ceilingAt = (income: number, share: number, utilities: number) =>
  Math.max(0, monthly(income) * share - utilities);

const ceilingSet = (income: number, utilities: number) => ({
  conservative: ceilingAt(income, SHARES.conservative, utilities),
  standard: ceilingAt(income, SHARES.standard, utilities),
  severe: ceilingAt(income, SHARES.severe, utilities),
});

export function ceilings(profile: Profile): Ceilings | null {
  const household = householdIncome(profile);
  if (profile.salary === null || household === null) return null;
  const n = people(profile);
  const utilitiesEach = profile.utilities / n;
  return {
    perPerson: ceilingSet(profile.salary, utilitiesEach),
    combined: ceilingSet(household, profile.utilities),
  };
}

/** Gross salary needed for a monthly cost to be 30% of income. */
export function salaryNeeded(monthlyCost: number, share = SHARES.standard) {
  return (monthlyCost * 12) / share;
}

/** The renter's share of a monthly cost when split evenly. */
export function perPerson(amount: number, profile: Profile) {
  return amount / people(profile);
}

export function shareOfGross(monthlyCost: number, salary: number | null) {
  return salary ? monthlyCost / monthly(salary) : null;
}

export function standing(monthlyCost: number, salary: number | null): Standing {
  const share = shareOfGross(monthlyCost, salary);
  if (share === null) return "unknown";
  if (share <= SHARES.standard) return "within";
  if (share <= SHARES.standard * (1 + NEAR_MARGIN)) return "near";
  return "over";
}

/** What is left of gross monthly pay after a housing cost. */
export function residual(monthlyCost: number, salary: number | null) {
  return salary === null ? null : monthly(salary) - monthlyCost;
}

/** Real monthly cost: rent, utilities, parking and fees, minus concessions
 * spread over a 12-month lease. */
export function allInMonthly(l: Listing): number {
  return l.baseRent + l.utilities + l.parking + l.fees - l.concession / 12;
}

export function niceValue(l: Listing, prefs: Preference[]): number {
  return prefs
    .filter((p) => p.tier === "nice" && l.features.includes(p.feature))
    .reduce((sum, p) => sum + p.valuePerMonth, 0);
}

/** All-in cost minus what the renter says the included extras are worth. */
export function adjustedCost(l: Listing, prefs: Preference[]): number {
  return allInMonthly(l) - niceValue(l, prefs);
}

export function mustHaves(
  l: Listing,
  prefs: Preference[],
): { met: FeatureId[]; missing: FeatureId[] } {
  const musts = prefs.filter((p) => p.tier === "must").map((p) => p.feature);
  return {
    met: musts.filter((f) => l.features.includes(f)),
    missing: musts.filter((f) => !l.features.includes(f)),
  };
}

export interface Ranked {
  listing: Listing;
  allIn: number;
  yourShare: number;
  adjustedShare: number;
  share: number | null;
  standing: Standing;
  missing: FeatureId[];
  walkMinutes: number | null;
}

/**
 * Listings in order of fit: every must-have met first, then lowest adjusted
 * cost per person, then shortest commute.
 */
export function rankListings(
  listings: Listing[],
  profile: Profile,
  prefs: Preference[],
  walkMinutes: (l: Listing) => number | null,
): Ranked[] {
  return listings
    .map((listing) => {
      const allIn = allInMonthly(listing);
      const yourShare = perPerson(allIn, profile);
      return {
        listing,
        allIn,
        yourShare,
        adjustedShare: perPerson(adjustedCost(listing, prefs), profile),
        share: shareOfGross(yourShare, profile.salary),
        standing: standing(yourShare, profile.salary),
        missing: mustHaves(listing, prefs).missing,
        walkMinutes: walkMinutes(listing),
      };
    })
    .toSorted(
      (a, b) =>
        Number(a.missing.length > 0) - Number(b.missing.length > 0) ||
        a.adjustedShare - b.adjustedShare ||
        (a.walkMinutes ?? Infinity) - (b.walkMinutes ?? Infinity),
    );
}
