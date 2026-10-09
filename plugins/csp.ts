import type { Plugin } from "vite";

// Every request the page makes must stay on its own origin. GitHub Pages
// cannot set response headers, so the policy ships as a meta tag. It is only
// added to production builds because the dev server needs inline scripts and
// a WebSocket for hot reload.
export const POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  // MapLibre's bundled worker is started from a blob: URL.
  "worker-src 'self' blob:",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

export function csp(): Plugin {
  return {
    name: "casaperfecto:csp",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: POLICY },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}
