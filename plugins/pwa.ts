// Installable, offline-capable build: the web app manifest, the icon and the
// service worker are all generated from the design tokens and the build
// output, so the icon and accent color cannot drift apart.
import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Plugin } from "vite";
import { PALETTES } from "../src/design/tokens.ts";

const PUBLIC = new URL("../public/", import.meta.url).pathname;

/** The mark: a circle for the commute radius with a doorway cut into it. */
export function iconSvg(
  ring = PALETTES.light.accent,
  door = PALETTES.light.base,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="${ring}"/><path d="M24 62V40a8 8 0 0 1 16 0v22z" fill="${door}"/></svg>`;
}

export function manifest() {
  return {
    name: "CasaPerfecto",
    short_name: "CasaPerfecto",
    description:
      "Find a home you can walk to work from, at a rent your salary supports.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: PALETTES.light.base,
    theme_color: PALETTES.light.accent,
    icons: [
      { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

function publicFiles(dir = PUBLIC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? publicFiles(path)
      : [relative(PUBLIC, path)];
  });
}

export function serviceWorker(files: string[], version: string): string {
  return `// Generated at build time. Precaches the app, its data and the basemap.
const CACHE = "casaperfecto-${version}";
const FILES = ${JSON.stringify(files)};
const scope = self.registration.scope;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => scope + f))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// PMTiles reads the basemap with HTTP range requests; answer them from the
// cached whole file.
async function ranged(request, response) {
  const match = /bytes=(\\d+)-(\\d*)/.exec(request.headers.get("range") || "");
  if (!match) return response;
  const blob = await response.blob();
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : blob.size - 1;
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Range": "bytes " + start + "-" + end + "/" + blob.size,
      "Content-Length": String(end - start + 1),
      "Content-Type": "application/octet-stream",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !request.url.startsWith(scope)) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(scope + "index.html")),
    );
    return;
  }
  event.respondWith(
    caches.match(request.url, { ignoreSearch: true }).then((hit) => {
      if (!hit) return fetch(request);
      return request.headers.has("range") ? ranged(request, hit) : hit;
    }),
  );
});
`;
}

export function pwa(): Plugin {
  return {
    name: "casaperfecto:pwa",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "link",
          attrs: { rel: "manifest", href: "manifest.webmanifest" },
        },
        {
          tag: "link",
          attrs: { rel: "icon", href: "icon.svg", type: "image/svg+xml" },
        },
        {
          tag: "link",
          attrs: { rel: "apple-touch-icon", href: "icons/icon-192.png" },
        },
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            content: PALETTES.light.accent,
            media: "(prefers-color-scheme: light)",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            content: PALETTES.dark.base,
            media: "(prefers-color-scheme: dark)",
          },
        },
      ];
    },
    generateBundle(_options, bundle) {
      this.emitFile({ type: "asset", fileName: "icon.svg", source: iconSvg() });
      this.emitFile({
        type: "asset",
        fileName: "manifest.webmanifest",
        source: JSON.stringify(manifest(), null, 2),
      });
      const files = [
        "index.html",
        "icon.svg",
        "manifest.webmanifest",
        ...Object.keys(bundle).filter(
          (f) =>
            !f.endsWith(".map") &&
            !f.startsWith(".vite/") &&
            f !== "index.html",
        ),
        ...publicFiles(),
      ];
      const unique = [...new Set(files)].toSorted();
      const version = createHash("sha256")
        .update(unique.join("\n"))
        .update(String(Date.now()))
        .digest("hex")
        .slice(0, 12);
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: serviceWorker(unique, version),
      });
    },
  };
}
