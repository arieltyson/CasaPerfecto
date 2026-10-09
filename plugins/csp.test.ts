import { POLICY } from "./csp.ts";

describe("content security policy", () => {
  const directives = POLICY.split("; ");

  it("allows no host other than the page's own origin", () => {
    for (const directive of directives) {
      const sources = directive.split(" ").slice(1);
      for (const source of sources) {
        expect(source).toMatch(/^('self'|'none'|data:|blob:)$/);
      }
    }
  });

  it("falls back to same-origin for anything not listed", () => {
    expect(directives).toContain("default-src 'self'");
  });
});
