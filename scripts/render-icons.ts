// Renders the PNG app icons from the token-driven SVG with headless Chromium.
// Run with `npm run icons` after changing the mark or the accent color.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { iconSvg } from "../plugins/pwa.ts";
import { PALETTES } from "../src/design/tokens.ts";

const OUT = new URL("../public/icons/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(name: string, size: number, padding: number) {
  const inner = size - padding * 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:${PALETTES.light.base}">
      <div style="padding:${padding}px;width:${inner}px;height:${inner}px">${iconSvg()}</div>
    </body>`,
  );
  await page.screenshot({ path: `${OUT}${name}`, omitBackground: false });
}

await render("icon-192.png", 192, 8);
await render("icon-512.png", 512, 20);
// Maskable icons keep the mark inside the central 80% safe zone.
await render("icon-maskable-512.png", 512, 72);
await browser.close();
console.log("Icons written to public/icons.");
