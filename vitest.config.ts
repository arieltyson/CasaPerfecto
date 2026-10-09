import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: [
      "src/**/*.test.{ts,tsx}",
      "pipeline/**/*.test.ts",
      "plugins/**/*.test.ts",
    ],
    environment: "node",
  },
});
