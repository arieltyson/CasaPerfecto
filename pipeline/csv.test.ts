import { gtfsSeconds, parseCsv } from "./csv.ts";
import { percentRanks } from "./safety.ts";

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

describe("percentRanks", () => {
  it("ranks each value by the share of values below it", () => {
    expect(percentRanks([0, 0, 5, 10])).toEqual([0, 0, 50, 75]);
  });
});
