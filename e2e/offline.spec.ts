import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "allow" });

test("works offline after the first visit", async ({ page, context }) => {
  await page.goto("./");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    // Wait until the install step has cached every file.
    while (registration.active?.state !== "activated") {
      await new Promise((r) => setTimeout(r, 100));
    }
  });
  await expect
    .poll(() => page.evaluate(async () => (await caches.keys()).length))
    .toBeGreaterThan(0);

  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await page.getByRole("button", { name: "Show the map" }).click();
  const handle = page.getByRole("button", { name: "Expand panel" });
  if (await handle.isVisible()) await handle.click();
  await expect(page.getByText(/of 1,917/)).toBeVisible({ timeout: 15_000 });
});
