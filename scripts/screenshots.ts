// Captures README screenshots, the README banner and the social preview from
// a production build. State is seeded into sessionStorage before the page
// loads, so no demo code ships in the app. Run `npm run build` first, then
// `npm run screenshots`.
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { type Page, chromium, devices } from "@playwright/test";
import { iconSvg } from "../plugins/pwa.ts";
import { defaultState } from "../src/app/model.ts";
import { reducer } from "../src/app/reducer.ts";
import { PALETTES } from "../src/design/tokens.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const SHOTS = `${ROOT}docs/screenshots/`;
const PORT = 4174;
const URL_BASE = `http://localhost:${PORT}/CasaPerfecto/`;
mkdirSync(SHOTS, { recursive: true });

function seededState() {
  let s = defaultState();
  const act = (a: Parameters<typeof reducer>[1]) => (s = reducer(s, a));
  act({ type: "finishOnboarding" });
  act({
    type: "setProfile",
    profile: { salary: 135_000, unitType: "2b2b", utilities: 300 },
  });
  act({ type: "setRoommates", roommates: 1 });
  act({ type: "setTier", feature: "laundry", tier: "must" });
  act({ type: "setTier", feature: "pets", tier: "must" });
  act({ type: "setTier", feature: "outdoor", tier: "nice" });
  act({ type: "setValue", feature: "outdoor", valuePerMonth: 100 });
  act({ type: "setTier", feature: "gym", tier: "without" });
  const listing = (
    id: string,
    address: string,
    lon: number,
    lat: number,
    baseRent: number,
    features: (typeof s.listings)[number]["features"],
  ) =>
    act({
      type: "saveListing",
      listing: {
        id,
        address,
        location: { lon, lat },
        unitType: "2b2b",
        baseRent,
        utilities: 280,
        parking: 0,
        fees: 40,
        concession: id === "b" ? 4000 : 0,
        features,
        notes: "",
      },
    });
  listing("a", "Nob Hill walk-up", -122.4139, 37.7925, 5700, [
    "laundry",
    "pets",
  ]);
  listing("b", "Rincon Hill tower", -122.3927, 37.7866, 6300, [
    "laundry",
    "pets",
    "outdoor",
    "gym",
  ]);
  listing("c", "North Beach flat", -122.4088, 37.7999, 5400, [
    "pets",
    "outdoor",
  ]);
  return s;
}

async function seed(page: Page) {
  const state = seededState();
  await page.addInitScript((value) => {
    sessionStorage.setItem(
      "casaperfecto:state",
      JSON.stringify({ kind: "plain", state: value }),
    );
  }, state);
}

function serve(): Promise<ChildProcess> {
  const server = spawn(
    "npx",
    ["vite", "preview", "--port", String(PORT), "--strictPort"],
    {
      cwd: ROOT,
      stdio: "ignore",
    },
  );
  return new Promise((resolve) => setTimeout(() => resolve(server), 2500));
}

const server = await serve();
const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});

try {
  const phone = await browser.newContext({
    ...devices["iPhone 13"],
    serviceWorkers: "block",
  });
  const page = await phone.newPage();
  await seed(page);
  await page.goto(URL_BASE);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${SHOTS}commute-map.png` });

  const expand = page.getByRole("button", { name: "Expand panel" });
  await expand.click();
  await page.getByRole("tab", { name: "Budget" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}budget.png` });

  await page.getByRole("tab", { name: "Listings" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}ledger.png` });

  await page.getByRole("tab", { name: "Commute" }).click();
  await page.getByRole("button", { name: "Collapse panel" }).click();
  await page.getByRole("button", { name: "Show map layers" }).click();
  await page.getByRole("radio", { name: "Violent incidents" }).check();
  await page.getByRole("switch", { name: "Danger zones" }).check();
  await page.getByRole("button", { name: "Hide map layers" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}safety-layer.png` });

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block",
  });
  const wide = await desktop.newPage();
  await seed(wide);
  await wide.goto(URL_BASE);
  await wide.waitForTimeout(4500);
  await wide.screenshot({ path: `${SHOTS}desktop.png` });

  // Banner (README) and social preview: title and subtitle over the dark
  // brand gradient, with the desktop screenshot below.
  const card = await browser.newPage();
  for (const [file, width, height] of [
    [`${ROOT}docs/banner.png`, 1000, 500],
    [`${ROOT}public/social.png`, 1200, 630],
  ] as const) {
    await card.setViewportSize({ width, height });
    await card.setContent(`
      <body style="margin:0;width:${width}px;height:${height}px;overflow:hidden;
        background:linear-gradient(${PALETTES.dark.raised},${PALETTES.dark.base});
        font-family:Inter,system-ui,sans-serif;text-align:center;color:#fff">
        <div style="padding-top:${Math.round(height * 0.08)}px">
          <div style="width:64px;height:64px;margin:0 auto 16px">${iconSvg(PALETTES.dark.accent, PALETTES.dark.base)}</div>
          <div style="font-size:36pt;line-height:40pt;font-weight:700;color:${PALETTES.dark.textPrimary}">CasaPerfecto</div>
          <div style="font-size:20pt;line-height:24pt;color:${PALETTES.dark.accent};margin-top:8px">Walk to work. Afford the rent. Know the block.</div>
        </div>
        <img src="data:image/png;base64,${await screenshotBase64(wide)}"
          style="width:${Math.round(width * 0.82)}px;margin-top:${Math.round(height * 0.06)}px;border-radius:14px;
          box-shadow:0 20px 60px rgba(0,0,0,.5)">
      </body>`);
    await card.waitForTimeout(300);
    await card.screenshot({ path: file });
  }
  console.log(
    "Screenshots written to docs/screenshots, docs/banner.png and public/social.png.",
  );
} finally {
  await browser.close();
  server.kill();
}

async function screenshotBase64(page: Page) {
  return (await page.screenshot()).toString("base64");
}
