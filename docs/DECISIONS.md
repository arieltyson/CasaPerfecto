# Decision log

Each entry records a decision and the reason for it. A reversal is a new entry that names the one it overturns; earlier entries are not edited.

## 1. The thesis

"It shows you where you can live, not where you can't." The first view is the commute shading. Safety layers are off until turned on, and there is no combined neighborhood grade.

## 2. No backend

Every calculation runs in the browser and every file is served from the site's own origin. A Content Security Policy blocks other origins, and an end-to-end test fails on any cross-origin request. This rules out live listings, geocoding APIs and notifications.

## 3. Notifications: none

Push, email and reminders all need a server that knows who the renter is. Considered and declined.

## 4. Workplace search uses street intersections

There is no geocoding service, so the pipeline extracts named intersections from OpenStreetMap. The renter types an intersection or picks a point on the map. The blueprint's bundled address list was not used: intersections are smaller and enough to locate a workplace or a listing.

## 5. Default workplace label is "350 Bush St"

The study area is centered on 350 Bush St. The interface names the address, not a company.

## 6. Walking speed and hills

Base pace is 1.3 m/s (Bohannon and Andrews, 2011). Edge times use Tobler's hiking function on USGS elevation, so uphill and downhill times differ. Bridges and tunnels use a constant grade between their ends.

## 7. Transit model

A backward search from the workplace: walk to the alighting stop, the best ride per pattern, half the headway as waiting (capped at 15 minutes) plus one minute to board, and one transfer. It models a typical weekday morning, not live service.

## 8. GTFS service date falls back to the latest covered weekday

On 2026-10-09 SFMTA's only published feed covered service through 2026-08-28. The pipeline uses the next Wednesday the feed covers, or the latest covered Wednesday when none is ahead, and the app shows the sample date. The weekly refresh picks up a new feed when SFMTA publishes one.

## 9. Incident scale: "none reported" plus quartiles (reverses an earlier draft)

The first draft ranked cells by percentile. About 60% of cells have no reported violent incidents, so percentiles bunched at zero and most neighborhoods showed a median of 0. The scale is now one step for "none reported" and four quartiles of the cells with reports. Danger zones remain the top 10% of all cells by count.

## 10. One shading at a time

The map shades blocks by commute time, violent incidents or property incidents, chosen with one control. Two overlapping fills could not be read. When shading by incidents, blocks beyond the commute limit are dimmed so the reachable area stays visible.

## 11. Ramps reverse in dark mode

Order is encoded by luminance within one hue. On a light map the notable end of a scale is dark; on a dark map it is bright. The same steps are used in reverse, which tests assert.

## 12. Panels follow the appearance (reverses Design D0, decision 1)

The blueprint kept the glass panels dark in both appearances. In practice a dark panel over a light basemap needed its own token set and failed to match the rest of the interface. Panels now use the raised color of the current appearance at 90% opacity with a blur, so every panel color is covered by the contrast tests.

## 13. No alternate icon

Apartment hunting is not a sensitive category in the way health or finance apps are. Considered and declined.

## 14. Lighthouse CI replaced by budget and end-to-end checks

`scripts/check-budget.ts` fails the build if the first-screen JavaScript exceeds 300 KB gzipped or the lazy map chunk exceeds 400 KB. Playwright and axe check accessibility, privacy and offline behavior on every deploy. A Lighthouse run would duplicate these checks with a heavy dependency.

## 15. Fonts and runtime dependencies

Runtime JavaScript dependencies are react, react-dom, maplibre-gl and pmtiles. Inter is bundled from `@fontsource-variable/inter` as font files only, so it is served from the site's own origin.

## 16. The locked screen follows the browser language

The saved language setting is encrypted with the rest of the data, so the unlock screen uses the browser's language until the data is opened.

## 17. Rent baselines are updated by hand

Listing sites do not allow scraping. `src/data/rents.ts` is updated monthly from the published medians, and every screen that shows them shows the date.
