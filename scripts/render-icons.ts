// Renders the PNG app icons from the token-driven SVG with headless Chromium.
// Run with `npm run icons` after changing the mark or the accent color.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { iconSvg } from "../plugins/pwa.ts";
import { PALETTES } from "../src/design/tokens.ts";

const OUT = new URL("../public/icons/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(
  name: string,
  size: number,
  padding: number,
  transparent = false,
) {
  const inner = size - padding * 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:${transparent ? "transparent" : PALETTES.light.base}">
      <div style="padding:${padding}px;width:${inner}px;height:${inner}px">${iconSvg()}</div>
    </body>`,
  );
  await page.screenshot({ path: `${OUT}${name}`, omitBackground: transparent });
}

await render("icon-192.png", 192, 8);
await render("icon-512.png", 512, 20);
// Maskable icons keep the mark inside the central 80% safe zone.
await render("icon-maskable-512.png", 512, 72);
// Browser-tab icons: transparent corners, PNG for every browser, and an ICO
// for browsers that look for favicon.ico.
await render("favicon-16.png", 16, 0, true);
await render("favicon-32.png", 32, 0, true);
await browser.close();

/** An ICO file that embeds PNG images, which every current browser reads. */
function ico(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const header = 6 + images.length * 16;
  const total = header + images.reduce((n, i) => n + i.png.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = header;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16;
    view.setUint8(entry, size % 256);
    view.setUint8(entry + 1, size % 256);
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}

writeFileSync(
  new URL("../public/favicon.ico", import.meta.url),
  ico(
    [16, 32].map((size) => ({
      size,
      png: readFileSync(`${OUT}favicon-${size}.png`),
    })),
  ),
);
console.log("Icons written to public/icons.");
