import {
  DEFICIENCIES,
  contrast,
  hueDistance,
  luminance,
  simulatedLuminance,
} from "./color.ts";
import {
  APPEARANCES,
  MAP_ALERT,
  MIN_TARGET,
  PALETTES,
  RAMPS,
  TERTIARY_MIN_REM,
  TYPE,
} from "./tokens.ts";

const TEXT = ["textPrimary", "textSecondary", "textTertiary"] as const;
const BACKGROUNDS = ["base", "surface", "raised"] as const;

function minTextContrast(appearance: (typeof APPEARANCES)[number]) {
  const p = PALETTES[appearance];
  return Math.min(
    ...TEXT.flatMap((t) => BACKGROUNDS.map((b) => contrast(p[t], p[b]))),
  );
}

describe("contrast", () => {
  it("computes the WCAG reference values", () => {
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  it.each(APPEARANCES)("%s: all text clears 4.5:1 on every surface", (a) => {
    expect(minTextContrast(a)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(APPEARANCES)("%s: on-accent text clears 4.5:1", (a) => {
    const p = PALETTES[a];
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(APPEARANCES)("%s: controls and focus clear 3:1", (a) => {
    const p = PALETTES[a];
    for (const bg of BACKGROUNDS) {
      expect(contrast(p.accent, p[bg])).toBeGreaterThanOrEqual(3);
      expect(contrast(p.focus, p[bg])).toBeGreaterThanOrEqual(3);
    }
  });

  it("high-contrast palettes exceed their standard counterparts", () => {
    expect(minTextContrast("hcLight")).toBeGreaterThan(
      minTextContrast("light"),
    );
    expect(minTextContrast("hcDark")).toBeGreaterThan(minTextContrast("dark"));
  });
});

describe("ordinal ramps", () => {
  const ramps = [RAMPS.commuteLight, RAMPS.incidentsLight];

  it("hold one hue per scale", () => {
    for (const ramp of ramps) {
      for (const step of ramp) {
        expect(hueDistance(step, ramp[2]!)).toBeLessThan(15);
      }
    }
  });

  it("darken strictly with a visible gap, in full color and grayscale", () => {
    for (const ramp of ramps) {
      const l = ramp.map(luminance);
      for (let i = 1; i < l.length; i++) {
        expect(l[i - 1]! - l[i]!).toBeGreaterThanOrEqual(0.08);
      }
    }
  });

  it.each(DEFICIENCIES)("stay strictly ordered under %s", (kind) => {
    for (const ramp of ramps) {
      const l = ramp.map((c) => simulatedLuminance(c, kind));
      for (let i = 1; i < l.length; i++) {
        expect(l[i - 1]! - l[i]!).toBeGreaterThanOrEqual(0.08);
      }
    }
  });

  it("keep the accent at least 90 degrees of hue from every data color", () => {
    for (const a of APPEARANCES) {
      for (const ramp of ramps) {
        for (const step of ramp) {
          expect(hueDistance(PALETTES[a].accent, step)).toBeGreaterThanOrEqual(
            90,
          );
        }
      }
    }
  });

  it("use the same steps in reverse for dark maps", () => {
    expect(RAMPS.commuteDark).toEqual(RAMPS.commuteLight.toReversed());
    expect(RAMPS.incidentsDark).toEqual(RAMPS.incidentsLight.toReversed());
  });
});

describe("map marks", () => {
  it("draws the Tenderloin boundary at 3:1 or more against the page base", () => {
    expect(
      contrast(MAP_ALERT.light, PALETTES.light.base),
    ).toBeGreaterThanOrEqual(3);
    expect(contrast(MAP_ALERT.dark, PALETTES.dark.base)).toBeGreaterThanOrEqual(
      3,
    );
  });
});

describe("scale tokens", () => {
  it("keep tertiary text at or above its floor", () => {
    expect(TYPE.metadata).toBeGreaterThanOrEqual(TERTIARY_MIN_REM);
    expect(Math.min(...Object.values(TYPE))).toBeGreaterThanOrEqual(
      TERTIARY_MIN_REM,
    );
  });

  it("keep touch targets at 44 px or more", () => {
    expect(MIN_TARGET).toBeGreaterThanOrEqual(44);
  });
});
