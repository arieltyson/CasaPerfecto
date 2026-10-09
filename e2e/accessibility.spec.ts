import { AxeBuilder } from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";
import { expandSheet, onboard, openTab } from "./helpers.ts";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(TAGS)
    // The map canvas is exposed as one labelled image; its basemap labels are
    // drawn pixels, not text, so axe cannot check them.
    .exclude(".maplibregl-canvas-container")
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${label}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`,
  );
  expect(summary).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} appearance`, () => {
    test.use({ colorScheme: scheme });

    test("welcome and onboarding have no WCAG violations", async ({ page }) => {
      await page.goto("./");
      await audit(page, "welcome");
      await page.getByRole("button", { name: "Start" }).click();
      for (const step of ["city", "workplace", "commute"]) {
        await audit(page, step);
        await page.getByRole("button", { name: "Next" }).click();
      }
      await audit(page, "budget");
    });

    test("every dashboard tab has no WCAG violations", async ({ page }) => {
      await onboard(page, { salary: "110000" });
      await expandSheet(page);
      for (const tab of [
        "Commute",
        "Budget",
        "Must-haves",
        "Listings",
        "Areas",
        "Settings",
      ]) {
        await openTab(page, tab);
        await audit(page, tab);
      }
    });
  });
}

test("tabs follow the WAI-ARIA keyboard pattern", async ({ page }) => {
  await onboard(page);
  await page.getByRole("tab", { name: "Commute" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Budget" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Budget" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Settings" })).toBeFocused();
});

test("content reflows at 320 CSS pixels without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("./");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});

test("the map has a text summary and the Areas tab carries its detail", async ({
  page,
}) => {
  await onboard(page);
  await expect(page.locator("canvas.maplibregl-canvas")).toHaveAttribute(
    "aria-label",
    /blocks within a 20 minute commute of 350 Bush St/,
  );
  await expandSheet(page);
  await openTab(page, "Areas");
  await expect(page.getByRole("table")).toContainText("Chinatown");
});
