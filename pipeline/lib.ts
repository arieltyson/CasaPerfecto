// Shared helpers for the build-time data pipeline. Nothing here ships to the
// browser.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_WORKPLACE } from "../src/app/model.ts";

export const ROOT = new URL("..", import.meta.url).pathname;
export const CACHE = join(ROOT, "pipeline/.cache");
export const DATA_OUT = join(ROOT, "public/data");
export const BASEMAP_OUT = join(ROOT, "public/basemap");

export const CENTER = {
  lon: DEFAULT_WORKPLACE.lon,
  lat: DEFAULT_WORKPLACE.lat,
};
export const AREA_SECONDS = 45 * 60;
// Grid and download extent: a 45-minute walk at 1.3 m/s is 3.5 km along the
// street network, so 4 km in a straight line covers it with a margin.
export const RADIUS_METERS = 4_000;

export const USER_AGENT =
  "CasaPerfecto-pipeline/1.0 (+https://github.com/arieltyson/CasaPerfecto)";

export function bbox(radius = RADIUS_METERS) {
  const dLat = radius / 111_320;
  const dLon = radius / (111_320 * Math.cos((CENTER.lat * Math.PI) / 180));
  return {
    south: CENTER.lat - dLat,
    west: CENTER.lon - dLon,
    north: CENTER.lat + dLat,
    east: CENTER.lon + dLon,
  };
}

export function log(step: string, message: string) {
  console.log(`[${step}] ${message}`);
}

function ensureDir(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

export function writeJson(path: string, value: unknown) {
  ensureDir(path);
  writeFileSync(path, JSON.stringify(value));
}

export function writeBytes(path: string, bytes: Uint8Array) {
  ensureDir(path);
  writeFileSync(path, bytes);
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  attempts = 4,
): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, ...init.headers },
      });
      if (res.ok) return res;
      lastError = new Error(`${res.status} ${res.statusText} for ${url}`);
      if (res.status < 500 && res.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 2_000 * 2 ** i));
  }
  throw lastError;
}

/** Downloads once into the cache directory and reuses the file afterwards. */
export async function cached(
  name: string,
  download: () => Promise<Uint8Array>,
  refresh = false,
): Promise<Uint8Array> {
  const path = join(CACHE, name);
  if (!refresh && existsSync(path)) return readFileSync(path);
  const bytes = await download();
  writeBytes(path, bytes);
  return bytes;
}

export async function fetchBytes(url: string, init?: RequestInit) {
  const res = await fetchWithRetry(url, init);
  return new Uint8Array(await res.arrayBuffer());
}

export function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
