// The single persisted state object. Every field has a default so a missing,
// partial or corrupted store loads as a usable state instead of throwing.

export const STATE_VERSION = 1;

export type UnitType = "studio" | "1b1b" | "2b1b" | "2b2b" | "3b";
export const UNIT_TYPES: readonly UnitType[] = [
  "studio",
  "1b1b",
  "2b1b",
  "2b2b",
  "3b",
];

export type CommuteMode = "walk" | "walk+muni";
export type Tier = "must" | "nice" | "without";
export type Language = "en" | "es";
export type Appearance = "system" | "light" | "dark";

export const FEATURE_IDS = [
  "laundry",
  "dishwasher",
  "outdoor",
  "elevator",
  "parking",
  "pets",
  "gym",
  "doorman",
  "rentControl",
  "light",
  "secondBath",
  "quiet",
] as const;
export type FeatureId = (typeof FEATURE_IDS)[number];

export const MAX_MUST_HAVES = 5;

export interface Point {
  lon: number;
  lat: number;
}

export interface Workplace extends Point {
  label: string;
}

export interface Profile {
  salary: number | null;
  roommates: number;
  roommateSalaries: (number | null)[];
  utilities: number;
  unitType: UnitType;
}

export interface CommutePrefs {
  maxMinutes: number;
  mode: CommuteMode;
  speed: number;
}

export interface Preference {
  feature: FeatureId;
  tier: Tier;
  valuePerMonth: number;
}

export interface Listing {
  id: string;
  address: string;
  location: Point | null;
  unitType: UnitType;
  baseRent: number;
  utilities: number;
  parking: number;
  fees: number;
  concession: number;
  features: FeatureId[];
  notes: string;
}

export interface Layers {
  violent: boolean;
  property: boolean;
  encampment: boolean;
  danger: boolean;
}

export interface Settings {
  remember: boolean;
  language: Language;
  appearance: Appearance;
  shareBudget: boolean;
}

export interface AppState {
  version: number;
  onboarded: boolean;
  city: "san-francisco";
  workplace: Workplace;
  commute: CommutePrefs;
  profile: Profile;
  preferences: Preference[];
  listings: Listing[];
  layers: Layers;
  settings: Settings;
}

// 350 Bush St, Financial District. The study area is every point within a
// 45-minute walk of here.
export const DEFAULT_WORKPLACE: Workplace = {
  label: "350 Bush St",
  lon: -122.40388,
  lat: 37.79072,
};

// Normal adult walking pace (Bohannon & Andrews, 2011, report 1.2 to 1.4 m/s
// for adults under 60).
export const DEFAULT_SPEED = 1.3;
export const SPEEDS = [1.0, 1.15, 1.3, 1.45] as const;
export const MIN_COMMUTE = 10;
export const MAX_COMMUTE = 45;

export function defaultPreferences(): Preference[] {
  return FEATURE_IDS.map((feature) => ({
    feature,
    tier: "without",
    valuePerMonth: 0,
  }));
}

export function defaultState(): AppState {
  return {
    version: STATE_VERSION,
    onboarded: false,
    city: "san-francisco",
    workplace: { ...DEFAULT_WORKPLACE },
    commute: { maxMinutes: 20, mode: "walk", speed: DEFAULT_SPEED },
    profile: {
      salary: null,
      roommates: 0,
      roommateSalaries: [],
      utilities: 150,
      unitType: "1b1b",
    },
    preferences: defaultPreferences(),
    listings: [],
    layers: {
      violent: false,
      property: false,
      encampment: false,
      danger: false,
    },
    settings: {
      remember: false,
      language: "en",
      appearance: "system",
      shareBudget: false,
    },
  };
}
