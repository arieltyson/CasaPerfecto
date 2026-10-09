import {
  type AppState,
  type CommutePrefs,
  type FeatureId,
  type Layers,
  type Listing,
  type Profile,
  type Settings,
  type Tier,
  type Workplace,
  MAX_MUST_HAVES,
  defaultState,
} from "./model.ts";

export type Action =
  | { type: "replace"; state: AppState }
  | { type: "finishOnboarding" }
  | { type: "setWorkplace"; workplace: Workplace }
  | { type: "setCommute"; commute: Partial<CommutePrefs> }
  | { type: "setProfile"; profile: Partial<Profile> }
  | { type: "setRoommates"; roommates: number }
  | { type: "setRoommateSalary"; index: number; salary: number | null }
  | { type: "setTier"; feature: FeatureId; tier: Tier }
  | { type: "setValue"; feature: FeatureId; valuePerMonth: number }
  | { type: "saveListing"; listing: Listing }
  | { type: "removeListing"; id: string }
  | { type: "setLayers"; layers: Partial<Layers> }
  | { type: "setSettings"; settings: Partial<Settings> }
  | { type: "reset" };

export function mustHaveCount(state: AppState): number {
  return state.preferences.filter((p) => p.tier === "must").length;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "replace":
      return action.state;
    case "finishOnboarding":
      return { ...state, onboarded: true };
    case "setWorkplace":
      return { ...state, workplace: action.workplace };
    case "setCommute":
      return { ...state, commute: { ...state.commute, ...action.commute } };
    case "setProfile":
      return { ...state, profile: { ...state.profile, ...action.profile } };
    case "setRoommates": {
      const roommates = Math.max(0, Math.min(3, Math.round(action.roommates)));
      const roommateSalaries = Array.from(
        { length: roommates },
        (_, i) => state.profile.roommateSalaries[i] ?? null,
      );
      return {
        ...state,
        profile: { ...state.profile, roommates, roommateSalaries },
      };
    }
    case "setRoommateSalary": {
      const roommateSalaries = state.profile.roommateSalaries.map((s, i) =>
        i === action.index ? action.salary : s,
      );
      return { ...state, profile: { ...state.profile, roommateSalaries } };
    }
    case "setTier": {
      // The must-have column is capped: past the cap the move is refused and
      // the UI explains why.
      if (action.tier === "must" && mustHaveCount(state) >= MAX_MUST_HAVES) {
        const already = state.preferences.find(
          (p) => p.feature === action.feature,
        );
        if (already?.tier !== "must") return state;
      }
      return {
        ...state,
        preferences: state.preferences.map((p) =>
          p.feature === action.feature ? { ...p, tier: action.tier } : p,
        ),
      };
    }
    case "setValue":
      return {
        ...state,
        preferences: state.preferences.map((p) =>
          p.feature === action.feature
            ? { ...p, valuePerMonth: Math.max(0, action.valuePerMonth) }
            : p,
        ),
      };
    case "saveListing": {
      const exists = state.listings.some((l) => l.id === action.listing.id);
      return {
        ...state,
        listings: exists
          ? state.listings.map((l) =>
              l.id === action.listing.id ? action.listing : l,
            )
          : [...state.listings, action.listing],
      };
    }
    case "removeListing":
      return {
        ...state,
        listings: state.listings.filter((l) => l.id !== action.id),
      };
    case "setLayers":
      return { ...state, layers: { ...state.layers, ...action.layers } };
    case "setSettings":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "reset":
      return defaultState();
  }
}
