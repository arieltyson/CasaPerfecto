import { gtfsSeconds, parseCsv } from "./csv.ts";
import { quartileBands } from "./safety.ts";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes and CRLF", () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n1,2\r\n');
    expect(rows).toEqual([
      { a: "x, y", b: 'say "hi"' },
      { a: "1", b: "2" },
    ]);
  });
});

describe("gtfsSeconds", () => {
  it("accepts times past midnight", () => {
    expect(gtfsSeconds("08:30:15")).toBe(30_615);
    expect(gtfsSeconds("25:00:00")).toBe(90_000);
  });
});

describe("quartileBands", () => {
  it("keeps zero apart and splits the rest into quartiles", () => {
    const { bands, limits } = quartileBands([0, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(limits).toEqual([3, 5, 7]);
    expect(bands).toEqual([0, 0, 1, 1, 1, 2, 2, 3, 3, 4]);
  });

  it("handles an area with no reports", () => {
    expect(quartileBands([0, 0]).bands).toEqual([0, 0]);
  });
});
