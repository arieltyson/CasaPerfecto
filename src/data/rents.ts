// Citywide median asking rents for San Francisco. Listing sites forbid
// scraping, so these are updated by hand each month from the published pages
// below, and the as-of date is shown wherever the numbers appear.
import type { UnitType } from "../app/model.ts";

export interface RentSource {
  name: string;
  url: string;
  asOf: string;
}

export const RENT_SOURCES = {
  zumper: {
    name: "Zumper",
    url: "https://www.zumper.com/rent-research/san-francisco-ca",
    asOf: "2026-10-08",
  },
  padmapper: {
    name: "PadMapper",
    url: "https://www.padmapper.com/apartments/san-francisco-ca",
    asOf: "2026-10-04",
  },
} as const satisfies Record<string, RentSource>;

export interface Baseline {
  /** Primary median (Zumper). */
  median: number;
  /** Second source for comparison (PadMapper). */
  check: number;
  /** Bedrooms, for splitting with roommates. */
  bedrooms: number;
}

// Both sources publish medians by bedroom count only, so the two
// two-bedroom layouts share one figure.
export const BASELINES: Record<UnitType, Baseline> = {
  studio: { median: 2700, check: 2950, bedrooms: 1 },
  "1b1b": { median: 4295, check: 4495, bedrooms: 1 },
  "2b1b": { median: 6235, check: 6378, bedrooms: 2 },
  "2b2b": { median: 6235, check: 6378, bedrooms: 2 },
  "3b": { median: 7497, check: 7495, bedrooms: 3 },
};

export const RENTS_AS_OF = RENT_SOURCES.zumper.asOf;
