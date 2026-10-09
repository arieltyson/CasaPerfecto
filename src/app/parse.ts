// Turns anything read from storage, a share link or an imported file into a
// valid AppState. Unknown or invalid fields fall back to their defaults.
import {
  type AppState,
  type FeatureId,
  type Listing,
  type Point,
  type Preference,
  type UnitType,
  FEATURE_IDS,
  MAX_COMMUTE,
  MIN_COMMUTE,
  STATE_VERSION,
  UNIT_TYPES,
  defaultState,
} from "./model.ts";

type Raw = Record<string, unknown>;

const isRecord = (v: unknown): v is Raw =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;

const money = (v: unknown, fallback = 0) => num(v, fallback, 0, 1_000_000);

const str = (v: unknown, fallback: string, maxLength = 500) =>
  typeof v === "string" ? v.slice(0, maxLength) : fallback;

const bool = (v: unknown, fallback: boolean) =>
  typeof v === "boolean" ? v : fallback;

function oneOf<T extends string>(
  v: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return options.includes(v as T) ? (v as T) : fallback;
}

function point(v: unknown): Point | null {
  if (!isRecord(v)) return null;
  const lon = num(v["lon"], NaN, -180, 180);
  const lat = num(v["lat"], NaN, -90, 90);
  return Number.isNaN(lon) || Number.isNaN(lat) ? null : { lon, lat };
}

const isFeature = (v: unknown): v is FeatureId =>
  FEATURE_IDS.includes(v as FeatureId);

function preferences(v: unknown, fallback: Preference[]): Preference[] {
  if (!Array.isArray(v)) return fallback;
  const byFeature = new Map<FeatureId, Preference>();
  for (const item of v) {
    if (!isRecord(item) || !isFeature(item["feature"])) continue;
    byFeature.set(item["feature"], {
      feature: item["feature"],
      tier: oneOf(item["tier"], ["must", "nice", "without"], "without"),
      valuePerMonth: money(item["valuePerMonth"]),
    });
  }
  // Every feature appears exactly once, in a stable order.
  return fallback.map((p) => byFeature.get(p.feature) ?? p);
}

function listing(v: unknown, index: number): Listing | null {
  if (!isRecord(v)) return null;
  return {
    id: str(v["id"], `listing-${index}`, 64),
    address: str(v["address"], "", 200),
    location: point(v["location"]),
    unitType: oneOf<UnitType>(v["unitType"], UNIT_TYPES, "1b1b"),
    baseRent: money(v["baseRent"]),
    utilities: money(v["utilities"]),
    parking: money(v["parking"]),
    fees: money(v["fees"]),
    concession: money(v["concession"]),
    features: Array.isArray(v["features"])
      ? [...new Set(v["features"].filter(isFeature))]
      : [],
    notes: str(v["notes"], "", 2000),
  };
}

// Each migration takes a raw object at version n and returns version n + 1.
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {};

export function migrate(raw: Raw): Raw {
  let current = raw;
  let version = num(raw["version"], STATE_VERSION, 0);
  while (version < STATE_VERSION) {
    const step = MIGRATIONS[version];
    current = step ? step(current) : current;
    version += 1;
  }
  return { ...current, version: STATE_VERSION };
}

export function parseState(input: unknown): AppState {
  const d = defaultState();
  if (!isRecord(input)) return d;
  const raw = migrate(input);

  const workplace = isRecord(raw["workplace"]) ? raw["workplace"] : {};
  const wp = point(workplace);
  const commute = isRecord(raw["commute"]) ? raw["commute"] : {};
  const profile = isRecord(raw["profile"]) ? raw["profile"] : {};
  const layers = isRecord(raw["layers"]) ? raw["layers"] : {};
  const settings = isRecord(raw["settings"]) ? raw["settings"] : {};
  const roommates = Math.round(num(profile["roommates"], 0, 0, 3));
  const salary = profile["salary"];

  return {
    version: STATE_VERSION,
    onboarded: bool(raw["onboarded"], d.onboarded),
    city: "san-francisco",
    workplace: wp
      ? { ...wp, label: str(workplace["label"], d.workplace.label, 120) }
      : d.workplace,
    commute: {
      maxMinutes: Math.round(
        num(
          commute["maxMinutes"],
          d.commute.maxMinutes,
          MIN_COMMUTE,
          MAX_COMMUTE,
        ),
      ),
      mode: oneOf(commute["mode"], ["walk", "walk+muni"], d.commute.mode),
      speed: num(commute["speed"], d.commute.speed, 0.5, 2),
    },
    profile: {
      salary: salary === null ? null : money(salary, NaN) || null,
      roommates,
      roommateSalaries: Array.from({ length: roommates }, (_, i) => {
        const list = Array.isArray(profile["roommateSalaries"])
          ? profile["roommateSalaries"]
          : [];
        const value = list[i];
        return typeof value === "number" ? money(value) : null;
      }),
      utilities: money(profile["utilities"], d.profile.utilities),
      unitType: oneOf(profile["unitType"], UNIT_TYPES, d.profile.unitType),
    },
    preferences: preferences(raw["preferences"], d.preferences),
    listings: Array.isArray(raw["listings"])
      ? raw["listings"]
          .slice(0, 200)
          .map(listing)
          .filter((l): l is Listing => l !== null)
      : [],
    layers: {
      shade: oneOf(
        layers["shade"],
        ["commute", "violent", "property"],
        "commute",
      ),
      encampment: bool(layers["encampment"], false),
      danger: bool(layers["danger"], false),
    },
    settings: {
      remember: bool(settings["remember"], false),
      language: oneOf(settings["language"], ["en", "es"], "en"),
      appearance: oneOf(
        settings["appearance"],
        ["system", "light", "dark"],
        "system",
      ),
      shareBudget: bool(settings["shareBudget"], false),
    },
  };
}
