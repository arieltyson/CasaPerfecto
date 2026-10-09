import type { Plugin } from "vite";
import {
  type Palette,
  MAP_ALERT,
  MIN_TARGET,
  PALETTES,
  PANEL_BLUR_PX,
  PANEL_OPACITY,
  RADIUS,
  SPACE,
  TYPE,
} from "../src/design/tokens.ts";

const ID = "virtual:tokens.css";
const RESOLVED = `\0${ID}`;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function colors(p: Palette) {
  return Object.entries(p)
    .map(([k, v]) => `--color-${kebab(k)}: ${v};`)
    .join(" ");
}

/** CSS custom properties for every token, by appearance and contrast need. */
export function tokensCss(): string {
  const scale = [
    ...SPACE.map((v, i) => `--space-${i + 1}: ${v}px;`),
    ...Object.entries(RADIUS).map(([k, v]) => `--radius-${kebab(k)}: ${v}px;`),
    ...Object.entries(TYPE).map(([k, v]) => `--type-${kebab(k)}: ${v}rem;`),
    `--target: ${MIN_TARGET}px;`,
    `--panel-opacity: ${PANEL_OPACITY * 100}%;`,
    `--panel-blur: ${PANEL_BLUR_PX}px;`,
  ].join(" ");
  const { light, dark, hcLight, hcDark } = PALETTES;
  return `
:root { ${scale} ${colors(light)} --color-alert: ${MAP_ALERT.light}; color-scheme: light; }
@media (prefers-color-scheme: dark) {
  :root:not([data-appearance="light"]) { ${colors(dark)} --color-alert: ${MAP_ALERT.dark}; color-scheme: dark; }
}
:root[data-appearance="dark"] { ${colors(dark)} --color-alert: ${MAP_ALERT.dark}; color-scheme: dark; }
@media (prefers-contrast: more) {
  :root { ${colors(hcLight)} }
  :root[data-appearance="dark"] { ${colors(hcDark)} }
}
@media (prefers-contrast: more) and (prefers-color-scheme: dark) {
  :root:not([data-appearance="light"]) { ${colors(hcDark)} }
}
`;
}

export function tokens(): Plugin {
  return {
    name: "casaperfecto:tokens",
    resolveId(id) {
      return id === ID ? RESOLVED : undefined;
    },
    load(id) {
      return id === RESOLVED ? tokensCss() : undefined;
    },
  };
}
