import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { csp } from "./plugins/csp.ts";

// Served from https://arieltyson.github.io/CasaPerfecto/.
export const BASE = "/CasaPerfecto/";

export default defineConfig({
  base: BASE,
  plugins: [react(), csp()],
  build: {
    target: "es2024",
    manifest: true,
  },
  worker: {
    format: "es",
  },
});
