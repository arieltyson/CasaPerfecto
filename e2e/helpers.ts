import { type Page, expect } from "@playwright/test";

/** Walks through onboarding with the defaults and an optional salary. */
export async function onboard(
  page: Page,
  options: { salary?: string; remember?: boolean } = {},
) {
  await page.goto("./");
  await page.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  if (options.salary) {
    await page.getByLabel("Your gross yearly salary").fill(options.salary);
  }
  if (options.remember) {
    await page.getByRole("switch", { name: "Remember on this device" }).check();
  }
  await page.getByRole("button", { name: "Show the map" }).click();
  await expect(page.getByRole("tablist", { name: "Sections" })).toBeVisible();
}

export async function openTab(page: Page, name: string) {
  const tab = page.getByRole("tab", { name });
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
}

/** Expands the bottom sheet on phones so the whole panel is reachable. */
export async function expandSheet(page: Page) {
  const handle = page.getByRole("button", { name: "Expand panel" });
  if (await handle.isVisible()) await handle.click();
}
