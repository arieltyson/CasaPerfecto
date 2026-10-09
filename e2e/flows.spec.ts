import { expect, test } from "@playwright/test";
import { expandSheet, onboard, openTab } from "./helpers.ts";

test("commute limits change how many blocks are in reach", async ({ page }) => {
  await onboard(page);
  await expandSheet(page);
  const stat = page.getByText(/of 1,917/);
  await expect(stat).toBeVisible();
  const before = await stat.innerText();
  await page.getByRole("button", { name: "5 minutes longer" }).click();
  await expect(stat).not.toHaveText(before);
});

test("the budget card shows the 30% ceiling", async ({ page }) => {
  await onboard(page, { salary: "100000" });
  await expandSheet(page);
  await openTab(page, "Budget");
  // $100,000 a year is $8,333 a month; 30% is $2,500, minus $150 utilities.
  await expect(page.getByText("$2,350 a month", { exact: true })).toBeVisible();
});

test("listings are ranked by must-haves, then cost", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await onboard(page, { salary: "130000" });
  await expandSheet(page);
  await openTab(page, "Must-haves");
  await page
    .getByRole("group", { name: "Pets allowed" })
    .getByRole("radio", { name: "Must-have" })
    .check();
  await openTab(page, "Listings");
  for (const [name, rent, pets] of [
    ["No pets", "3000", false],
    ["Pets ok", "3500", true],
  ] as const) {
    await page.getByRole("button", { name: "Add a listing" }).click();
    await page.getByLabel("Address or name").fill(name);
    await page.getByLabel("Base rent per month").fill(rent);
    if (pets)
      await page.getByRole("checkbox", { name: "Pets allowed" }).check();
    await page.getByRole("button", { name: "Save" }).click();
  }
  const cards = page.locator("article.listing-card h3");
  await expect(cards).toHaveText(["Pets ok", "No pets"]);
  await expect(page.getByText("Missing: Pets allowed")).toBeVisible();
});

test("reports a missing data file instead of failing silently", async ({
  page,
}) => {
  await page.route("**/data/area.json", (route) => route.abort());
  await page.goto("./");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("The area data could not load.")).toBeVisible();
});

test("typing a salary keeps focus in the field", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  const salary = page.getByLabel("Your gross yearly salary");
  await salary.click();
  await page.keyboard.type("135000");
  await expect(salary).toHaveValue("135000");
  await expect(salary).toBeFocused();
});

test("a share link pasted into an open tab adds its listings", async ({
  page,
}) => {
  await onboard(page, { salary: "120000" });
  const listings = [
    {
      id: "x",
      address: "Pasted listing",
      baseRent: 3000,
      location: { lon: -122.4103, lat: 37.8008 },
    },
  ];
  const payload = Buffer.from(JSON.stringify({ listings }))
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  await page.goto(`./#s=${payload}`);
  await expandSheet(page);
  await openTab(page, "Listings");
  await expect(page.getByText("Pasted listing")).toBeVisible();
  await openTab(page, "Budget");
  await expect(page.getByLabel("Your gross yearly salary")).toHaveValue(
    "120000",
  );
  expect(page.url()).not.toContain("#s=");
});
