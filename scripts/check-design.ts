// Fails when a color literal or a pixel font size appears outside the token
// file. Colors must come from src/design/tokens.ts so every value is covered
// by the contrast tests, and type must be in rem so it follows the reader's
// text size.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const ALLOWED = new Set(["src/design/tokens.ts"]);

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const PX_FONT =
  /font-size:\s*\d+(\.\d+)?px|fontSize:\s*["']?\d+(\.\d+)?(px)?["']?[,}\s]/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const problems: string[] = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  if (!/\.(css|ts|tsx)$/.test(file) || ALLOWED.has(rel)) continue;
  if (/\.test\.tsx?$/.test(file)) continue;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      // Ignore `#` used in ids and URLs, which the color pattern can match.
      const code = line.replace(/["'`]#[a-z][\w-]*["'`]/g, "");
      if (COLOR.test(code)) problems.push(`${rel}:${i + 1} color literal`);
      if (PX_FONT.test(code)) problems.push(`${rel}:${i + 1} pixel font size`);
    });
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} design rule violation(s).`);
  process.exit(1);
}
console.log("Design rules: no color literals or pixel font sizes.");
