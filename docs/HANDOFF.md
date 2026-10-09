# Handoff

## Constraints that are not yours to relax

- **No third-party requests at runtime.** The CSP in `plugins/csp.ts` and `e2e/privacy.spec.ts` enforce it. A feature that needs another origin needs a decision log entry and a privacy policy update first.
- **Nothing the renter enters leaves the browser.** Salary, workplace, preferences and listings stay in session storage, or local storage by opt-in. Share links use the URL fragment, and salary is excluded unless the renter opts in.
- **Colors live only in `src/design/tokens.ts`.** `scripts/check-design.ts` fails on color literals or pixel font sizes anywhere else in `src`. The contrast and color-vision tests in `src/design/tokens.test.ts` cover every token.
- **The accent is the icon color.** `plugins/pwa.test.ts` asserts it.
- **Order is encoded by luminance within one hue, and color never carries meaning alone.** Every map encoding has a legend with numbers, and the Areas tab carries the same information as text.
- **Zero reports and no data are different.** A block with no reports is drawn and labeled "none"; a block outside the area is not drawn.
- **Routing stays off the main thread.** `src/workers/router.worker.ts` decodes the graph and runs every search.
- **Accessibility failures block deploys.** `e2e/accessibility.spec.ts` runs axe for WCAG 2.2 AA in both appearances.

## Decisions that were reversed

- Incident percentiles were replaced by "none reported" plus quartiles. See decision 9.
- Dark-tinted panels in both appearances were replaced by panels that follow the appearance. See decision 12.

## Routine work

- **Monthly:** update `src/data/rents.ts` from the Zumper and PadMapper San Francisco pages and change the dates.
- **Weekly (automatic):** `.github/workflows/data.yml` rebuilds the data and redeploys. Add a `SOCRATA_APP_TOKEN` repository secret to raise DataSF rate limits.
- **After visual changes:** `npm run build && npm run screenshots`.
