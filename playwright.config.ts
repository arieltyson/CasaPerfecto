import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}/CasaPerfecto/`,
    trace: "retain-on-failure",
    // Request interception does not see service worker traffic, so tests
    // run without it except the offline test, which opts back in.
    serviceWorkers: "block",
    launchOptions: {
      // Software WebGL so the map renders on CI machines without a GPU.
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/CasaPerfecto/`,
    reuseExistingServer: !process.env["CI"],
  },
});
