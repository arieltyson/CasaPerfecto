// Cuts the study area out of the Protomaps daily planet build and copies the
// fonts and sprites the style needs, so the map is served entirely from the
// site's own origin.
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { unzipSync, gunzipSync } from "fflate";
import {
  BASEMAP_OUT,
  CACHE,
  bbox,
  cached,
  fetchBytes,
  fetchWithRetry,
  log,
  writeBytes,
  writeJson,
} from "./lib.ts";

const PMTILES_VERSION = "1.31.2";
const ASSETS = "https://protomaps.github.io/basemaps-assets";
const FONTS = ["Noto Sans Regular", "Noto Sans Medium", "Noto Sans Italic"];
// Basic Latin, Latin-1, Latin Extended-A and general punctuation cover
// English and Spanish street and place names.
const GLYPH_RANGES = ["0-255", "256-511", "8192-8447"];
export const MAX_ZOOM = 15;

// Placeholder the browser replaces with the page's absolute base URL, since
// MapLibre needs absolute URLs for glyphs and sprites.
export const BASE_TOKEN = "__BASE__";

async function pmtilesBinary(): Promise<string> {
  const dir = join(CACHE, `pmtiles-${PMTILES_VERSION}`);
  const bin = join(dir, "pmtiles");
  if (existsSync(bin)) return bin;
  const os = process.platform === "darwin" ? "Darwin" : "Linux";
  const arch = process.arch === "arm64" ? "arm64" : "x86_64";
  const name =
    os === "Darwin"
      ? `go-pmtiles-${PMTILES_VERSION}_${os}_${arch}.zip`
      : `go-pmtiles_${PMTILES_VERSION}_${os}_${arch}.tar.gz`;
  const bytes = await fetchBytes(
    `https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/${name}`,
  );
  mkdirSync(dir, { recursive: true });
  if (name.endsWith(".zip")) {
    const file = unzipSync(bytes)["pmtiles"];
    if (!file) throw new Error("pmtiles binary missing from archive");
    writeBytes(bin, file);
  } else {
    writeBytes(join(dir, "archive.tar"), gunzipSync(bytes));
    execFileSync("tar", ["-xf", "archive.tar", "pmtiles"], { cwd: dir });
  }
  chmodSync(bin, 0o755);
  return bin;
}

async function latestBuild(): Promise<string> {
  for (let daysAgo = 0; daysAgo < 10; daysAgo++) {
    const date = new Date(Date.now() - daysAgo * 86_400_000);
    const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
    const url = `https://build.protomaps.com/${stamp}.pmtiles`;
    try {
      await fetchWithRetry(url, { method: "HEAD" }, 1);
      return url;
    } catch {
      // Builds are published daily; try the day before.
    }
  }
  throw new Error("No Protomaps build found in the last 10 days.");
}

function style(flavor: "light" | "dark") {
  return {
    version: 8,
    glyphs: `${BASE_TOKEN}basemap/fonts/{fontstack}/{range}.pbf`,
    sprite: `${BASE_TOKEN}basemap/sprites/${flavor}`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${BASE_TOKEN}basemap/area.pmtiles`,
        attribution:
          '<a href="https://openstreetmap.org/copyright">© OpenStreetMap</a> <a href="https://protomaps.com">Protomaps</a>',
      },
    },
    layers: layers("protomaps", namedFlavor(flavor), { lang: "en" }),
  };
}

export async function buildBasemap(refresh: boolean) {
  const out = join(BASEMAP_OUT, "area.pmtiles");
  if (refresh || !existsSync(out)) {
    const bin = await pmtilesBinary();
    const source = await latestBuild();
    const b = bbox();
    log("basemap", `extracting from ${source}`);
    rmSync(out, { force: true });
    mkdirSync(BASEMAP_OUT, { recursive: true });
    execFileSync(
      bin,
      [
        "extract",
        source,
        out,
        `--bbox=${b.west},${b.south},${b.east},${b.north}`,
        `--maxzoom=${MAX_ZOOM}`,
      ],
      { stdio: "inherit" },
    );
  }

  for (const font of FONTS) {
    for (const range of GLYPH_RANGES) {
      const bytes = await cached(`fonts/${font}/${range}.pbf`, () =>
        fetchBytes(`${ASSETS}/fonts/${encodeURIComponent(font)}/${range}.pbf`),
      );
      writeBytes(join(BASEMAP_OUT, "fonts", font, `${range}.pbf`), bytes);
    }
  }
  for (const flavor of ["light", "dark"] as const) {
    for (const suffix of [".json", ".png", "@2x.json", "@2x.png"]) {
      const bytes = await cached(`sprites/${flavor}${suffix}`, () =>
        fetchBytes(`${ASSETS}/sprites/v4/${flavor}${suffix}`),
      );
      writeBytes(join(BASEMAP_OUT, "sprites", `${flavor}${suffix}`), bytes);
    }
    writeJson(join(BASEMAP_OUT, `style-${flavor}.json`), style(flavor));
  }
  log("basemap", "styles, fonts and sprites written");
}
