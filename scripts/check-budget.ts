// Enforces the JavaScript budget for the first screen: the entry chunk and
// everything it imports statically must stay under 300 KB gzipped. Chunks
// loaded with import(), such as the map, are measured separately.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = new URL("../dist/", import.meta.url).pathname;
const INITIAL_BUDGET = 300 * 1024;
const LAZY_BUDGET = 400 * 1024;

type Chunk = {
  file: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
};

const manifest = JSON.parse(
  readFileSync(join(DIST, ".vite/manifest.json"), "utf8"),
) as Record<string, Chunk>;

const gz = (file: string) => gzipSync(readFileSync(join(DIST, file))).length;

function closure(key: string, seen = new Set<string>()): Set<string> {
  if (seen.has(key)) return seen;
  seen.add(key);
  for (const dep of manifest[key]?.imports ?? []) closure(dep, seen);
  return seen;
}

const entry = Object.keys(manifest).find((k) => manifest[k]?.isEntry);
if (!entry) throw new Error("No entry chunk in the Vite manifest.");

const initial = closure(entry);
const initialBytes = [...initial].reduce(
  (sum, key) => sum + gz(manifest[key]!.file),
  0,
);

const lines = [
  `Initial JS: ${(initialBytes / 1024).toFixed(1)} KB gzipped (budget ${INITIAL_BUDGET / 1024} KB)`,
];
let failed = initialBytes > INITIAL_BUDGET;

for (const [key, chunk] of Object.entries(manifest)) {
  if (!chunk.isDynamicEntry) continue;
  const bytes = [...closure(key)]
    .filter((k) => !initial.has(k))
    .reduce((sum, k) => sum + gz(manifest[k]!.file), 0);
  lines.push(
    `Lazy ${key}: ${(bytes / 1024).toFixed(1)} KB gzipped (budget ${LAZY_BUDGET / 1024} KB)`,
  );
  if (bytes > LAZY_BUDGET) failed = true;
}

console.log(lines.join("\n"));
if (failed) {
  console.error("JavaScript budget exceeded.");
  process.exit(1);
}
