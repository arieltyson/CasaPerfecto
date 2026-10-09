// Minimal RFC 4180 CSV reader for GTFS files: quoted fields, escaped quotes
// and CRLF line endings.
export function parseCsv(text: string): Record<string, string>[] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = parseRows(clean);
  const header = rows.shift() ?? [];
  return rows
    .filter((r) => r.length > 1 || r[0] !== "")
    .map((r) =>
      Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])),
    );
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** GTFS time ("25:10:00" is allowed) to seconds after midnight. */
export function gtfsSeconds(time: string): number {
  const [h, m, s] = time.trim().split(":").map(Number);
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
}
