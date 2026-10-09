// WCAG 2.2 relative luminance and contrast, plus color-vision simulation, so
// accessibility claims about the palette are checked by tests.

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

/** sRGB channel (0 to 255) to linear light, with the standard gamma curve. */
export function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminanceOfLinear([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function luminance(hex: string): number {
  return luminanceOfLinear(hexToRgb(hex).map(toLinear) as Rgb);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Hue angle in degrees (0 to 360). */
export function hue(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255) as Rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

export function hueDistance(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
}

// Full-severity dichromacy matrices in linear RGB (Machado, Oliveira &
// Fernandes, 2009).
const MATRICES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} as const;

export type Deficiency = keyof typeof MATRICES;
export const DEFICIENCIES = Object.keys(MATRICES) as Deficiency[];

/** Relative luminance of a color as seen with a color-vision deficiency. */
export function simulatedLuminance(hex: string, kind: Deficiency): number {
  const lin = hexToRgb(hex).map(toLinear);
  const m = MATRICES[kind];
  const out = m.map((row) =>
    Math.min(
      1,
      Math.max(0, row[0] * lin[0]! + row[1] * lin[1]! + row[2] * lin[2]!),
    ),
  ) as Rgb;
  return luminanceOfLinear(out);
}
