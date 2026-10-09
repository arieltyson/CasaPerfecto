import { PALETTES } from "../src/design/tokens.ts";
import { headTags, iconSvg, manifest, serviceWorker } from "./pwa.ts";

describe("identity", () => {
  it("uses the accent token as the icon color", () => {
    expect(iconSvg()).toContain(`fill="${PALETTES.light.accent}"`);
  });

  it("uses the same accent for the browser theme color", () => {
    expect(manifest().theme_color).toBe(PALETTES.light.accent);
  });

  it("keeps the doorway lighter than the ring", () => {
    expect(iconSvg()).toContain(`fill="${PALETTES.light.base}"`);
  });
});

describe("service worker", () => {
  const sw = serviceWorker(["index.html", "data/area.json"], "abc123");

  it("versions its cache", () => {
    expect(sw).toContain('"casaperfecto-abc123"');
  });

  it("precaches the listed files", () => {
    expect(sw).toContain('["index.html","data/area.json"]');
  });

  it("only handles requests inside its own scope", () => {
    expect(sw).toContain("request.url.startsWith(scope)");
  });
});

describe("favicons", () => {
  it("declares ICO and PNG icons for browsers without SVG favicons", () => {
    const icons = headTags()
      .filter((t) => t.attrs?.["rel"] === "icon")
      .map((t) => t.attrs?.["href"]);
    expect(icons).toEqual(["favicon.ico", "icons/favicon-32.png", "icon.svg"]);
  });
});
