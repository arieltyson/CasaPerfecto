// Every color in the product, defined once as data so the contrast and
// color-vision tests can assert on it. CSS custom properties are generated
// from this file at build time; no other file may contain a color literal.

export type Appearance = "light" | "dark" | "hcLight" | "hcDark";
export const APPEARANCES: readonly Appearance[] = [
  "light",
  "dark",
  "hcLight",
  "hcDark",
];

export interface Palette {
  base: string;
  surface: string;
  raised: string;
  separator: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  onAccent: string;
  focus: string;
}

export const PALETTES: Record<Appearance, Palette> = {
  light: {
    base: "#F6F3EE",
    surface: "#FFFFFF",
    raised: "#FFFFFF",
    separator: "#DDD6CC",
    textPrimary: "#1F1B17",
    textSecondary: "#57504A",
    textTertiary: "#6E665E",
    accent: "#B0472A",
    onAccent: "#FFFFFF",
    focus: "#1F1B17",
  },
  dark: {
    base: "#12100E",
    surface: "#1C1916",
    raised: "#26221E",
    separator: "#3A342E",
    textPrimary: "#F5F0E9",
    textSecondary: "#C8BFB4",
    textTertiary: "#A39A8F",
    accent: "#E58A64",
    onAccent: "#1A0D07",
    focus: "#F5F0E9",
  },
  hcLight: {
    base: "#FFFFFF",
    surface: "#FFFFFF",
    raised: "#FFFFFF",
    separator: "#8A8178",
    textPrimary: "#000000",
    textSecondary: "#2E2925",
    textTertiary: "#454039",
    accent: "#8C3418",
    onAccent: "#FFFFFF",
    focus: "#000000",
  },
  hcDark: {
    base: "#000000",
    surface: "#0B0A09",
    raised: "#16130F",
    separator: "#8A8178",
    textPrimary: "#FFFFFF",
    textSecondary: "#E6E0D8",
    textTertiary: "#CFC6BB",
    accent: "#F2A07D",
    onAccent: "#000000",
    focus: "#FFFFFF",
  },
};

// Ordinal scales encode order by luminance within one hue. Each list runs
// from the least to the most notable step. On a light map the notable end is
// dark; on a dark map it is bright, so the same order reads as emphasis in
// both appearances.
const TEAL = ["#E3F2F1", "#A9D8D4", "#6BB8B2", "#32918B", "#0F625D"];
const VIOLET = ["#EEE9F6", "#CDBFE6", "#A28ACF", "#7454AE", "#4A2C80"];

export const RAMPS = {
  /** Commute minutes: index 0 is the longest walk, index 4 the shortest. */
  commuteLight: TEAL,
  commuteDark: TEAL.toReversed(),
  /** Incident percentile: index 0 is the fewest, index 4 the most. */
  incidentsLight: VIOLET,
  incidentsDark: VIOLET.toReversed(),
} as const;

// Encampment reports have no hue so they never read as a third scale.
export const NEUTRAL_DOT = { light: "#4A4540", dark: "#D9D2C8" } as const;
// Hatching and outlines drawn over the map.
export const MAP_INK = { light: "#1F1B17", dark: "#F5F0E9" } as const;
// The permanent Tenderloin boundary. A dotted red line, kept apart from the
// accent (the workplace dot) by its shape and its legend entry.
export const MAP_ALERT = { light: "#C3241F", dark: "#FF6F66" } as const;

export const SPACE = [4, 8, 12, 16, 20, 24, 32, 48] as const;
export const RADIUS = {
  small: 6,
  medium: 10,
  card: 14,
  control: 10,
  sheet: 20,
  pill: 999,
} as const;

/** Minimum interactive target, stricter than WCAG 2.2's 24 px floor. */
export const MIN_TARGET = 44;

// Type roles in rem, against the reader's own root size.
export const TYPE = {
  screenTitle: 1.75,
  cardTitle: 1.25,
  sectionLabel: 0.8125,
  rowTitle: 1,
  body: 1,
  detail: 0.875,
  metadata: 0.8125,
  control: 0.9375,
} as const;
/** Tertiary text is never set below this size. */
export const TERTIARY_MIN_REM = 0.8125;

export const MOTION = { fadeMs: 200, cameraMs: 400 } as const;

// Glass panels over the map: the raised color at this opacity with a blur.
export const PANEL_OPACITY = 0.9;
export const PANEL_BLUR_PX = 14;
export const MAP_FILL_OPACITY = 0.55;
