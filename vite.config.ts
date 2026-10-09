import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { csp } from "./plugins/csp.ts";
import { tokens } from "./plugins/tokens.ts";

// Served from https://arieltyson.github.io/CasaPerfecto/.
export const BASE = "/CasaPerfecto/";

export default defineConfig({
  base: BASE,
  plugins: [react(), tokens(), csp()],
  build: {
    target: "es2024",
    manifest: true,
  },
  worker: {
    format: "es",
  },
});
