import { expect, test } from "@playwright/test";
import { expandSheet, onboard, openTab } from "./helpers.ts";

test("every request stays on the site's own origin", async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (
      !url.startsWith(origin) &&
      !url.startsWith("data:") &&
      !url.startsWith("blob:")
    ) {
      foreign.push(url);
    }
  });

  await onboard(page, { salary: "120000" });
  await expandSheet(page);
  await page.getByRole("radio", { name: "Walk + Muni" }).check();
  await expect(page.getByText("Calculating commute times…")).toBeHidden();
  await openTab(page, "Areas");
  await page.getByRole("button", { name: /Show Chinatown on the map/ }).click();
  await page.waitForTimeout(1500);

  expect(foreign).toEqual([]);
});

test("entries live in session storage unless the renter opts in", async ({
  page,
}) => {
  await onboard(page, { salary: "120000" });
  await page.waitForTimeout(800);
  const where = await page.evaluate(() => ({
    session: sessionStorage.getItem("casaperfecto:state"),
    local: localStorage.getItem("casaperfecto:state"),
  }));
  expect(where.session).toContain("120000");
  expect(where.local).toBeNull();
});

test("a passphrase seals remembered data", async ({ page }) => {
  await onboard(page, { salary: "120000", remember: true });
  await expandSheet(page);
  await openTab(page, "Settings");
  await page.getByLabel("Passphrase").fill("correct horse battery");
  await page.getByRole("button", { name: "Set passphrase" }).click();
  await expect(
    page.getByText("Saved data on this device is encrypted."),
  ).toBeVisible();
  await page.waitForTimeout(2500);
  const stored = await page.evaluate(() =>
    localStorage.getItem("casaperfecto:state"),
  );
  expect(stored).toContain('"sealed"');
  expect(stored).not.toContain("120000");

  await page.reload();
  await page.getByLabel("Passphrase").fill("correct horse battery");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("tablist", { name: "Sections" })).toBeVisible({
    timeout: 15_000,
  });
});

test("share links leave out salary by default", async ({ page }) => {
  await onboard(page, { salary: "120000" });
  await expandSheet(page);
  await openTab(page, "Settings");
  const link = await page.getByLabel("Link to these settings").inputValue();
  const payload = new URL(link).hash.split("s=")[1]!;
  const json = Buffer.from(
    payload.replaceAll("-", "+").replaceAll("_", "/"),
    "base64",
  ).toString();
  expect(json).not.toContain("120000");
  expect(link).not.toContain("?");
});

test("a share link opened while locked waits for the passphrase", async ({
  page,
}) => {
  await onboard(page, { salary: "120000", remember: true });
  await expandSheet(page);
  await openTab(page, "Settings");
  await page.getByLabel("Passphrase").fill("correct horse battery");
  await page.getByRole("button", { name: "Set passphrase" }).click();
  await expect(
    page.getByText("Saved data on this device is encrypted."),
  ).toBeVisible();
  await page.waitForTimeout(2500);

  const listings = [{ id: "x", address: "Shared listing", baseRent: 3000 }];
  const payload = Buffer.from(JSON.stringify({ listings }))
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  await page.goto(`./#s=${payload}`);
  await page.reload();

  // The unlock screen comes first, and the sealed data is untouched.
  await expect(page.getByLabel("Passphrase")).toBeVisible();
  const stored = await page.evaluate(() =>
    localStorage.getItem("casaperfecto:state"),
  );
  expect(stored).toContain('"sealed"');

  await page.getByLabel("Passphrase").fill("correct horse battery");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expandSheet(page);
  await openTab(page, "Listings");
  await expect(page.getByText("Shared listing")).toBeVisible({
    timeout: 15_000,
  });
  await openTab(page, "Budget");
  await expect(page.getByLabel("Your gross yearly salary")).toHaveValue(
    "120000",
  );
});
