import { PALETTES } from "../src/design/tokens.ts";
import { tokensCss } from "./tokens.ts";

describe("tokensCss", () => {
  const css = tokensCss();

  it("emits every palette value as a custom property", () => {
    for (const palette of Object.values(PALETTES)) {
      for (const value of Object.values(palette)) {
        expect(css).toContain(value);
      }
    }
  });

  it("follows the system appearance unless the reader overrides it", () => {
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain('[data-appearance="dark"]');
    expect(css).toContain('[data-appearance="light"]');
  });

  it("switches to high-contrast colors on request", () => {
    expect(css).toContain("prefers-contrast: more");
  });
});
