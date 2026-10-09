// The text equivalent of the map: one row per neighborhood with every value
// the map encodes in color.
import { useMemo, useState } from "react";
import { useData } from "../../app/data.tsx";
import { useAppState } from "../../app/state.tsx";
import { useUi } from "../../app/ui.tsx";
import { Button } from "../../design/components.tsx";
import { type Key, useT } from "../../i18n/i18n.tsx";
import type { HoodSummary } from "../../lib/areas.ts";

type Column =
  | "name"
  | "reachable"
  | "walk"
  | "transit"
  | "violent"
  | "property"
  | "encampment"
  | "danger";

const VALUE: Record<Column, (h: HoodSummary) => number | string> = {
  name: (h) => h.name,
  reachable: (h) => h.reachable / h.cells,
  walk: (h) => h.minWalk,
  transit: (h) => h.minTransit ?? Infinity,
  violent: (h) => h.violent / h.cells,
  property: (h) => h.property / h.cells,
  encampment: (h) => h.encampment / h.cells,
  danger: (h) => h.dangerCells,
};

const HEADERS: Record<Column, Key> = {
  name: "areas.colName",
  reachable: "areas.colReach",
  walk: "areas.colWalk",
  transit: "areas.colMuni",
  violent: "areas.colViolent",
  property: "areas.colProperty",
  encampment: "areas.colEncampment",
  danger: "areas.colDanger",
};

export function AreaList() {
  const { state } = useAppState();
  const { hoods, area } = useData();
  const { flyTo } = useUi();
  const { t, number, minutes } = useT();
  const [sort, setSort] = useState<{ column: Column; descending: boolean }>({
    column: "reachable",
    descending: true,
  });
  const transitOn = state.commute.mode === "walk+muni";
  const columns: Column[] = [
    "name",
    "reachable",
    "walk",
    ...(transitOn ? (["transit"] as const) : []),
    "violent",
    "property",
    "encampment",
    "danger",
  ];

  const rows = useMemo(() => {
    const get = VALUE[sort.column];
    return hoods.toSorted((a, b) => {
      const x = get(a);
      const y = get(b);
      const order =
        typeof x === "string" && typeof y === "string"
          ? x.localeCompare(y)
          : Number(x) - Number(y);
      return sort.descending ? -order : order;
    });
  }, [hoods, sort]);

  if (!area) return null;
  const toggle = (column: Column) =>
    setSort((s) =>
      s.column === column
        ? { column, descending: !s.descending }
        : { column, descending: column === "reachable" },
    );

  return (
    <section className="stack" aria-labelledby="areas-title">
      <h2 id="areas-title">{t("areas.title")}</h2>
      <p className="note">{t("areas.intro")}</p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className={c === "name" ? "" : "num"}
                  aria-sort={
                    sort.column === c
                      ? sort.descending
                        ? "descending"
                        : "ascending"
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => toggle(c)}
                  >
                    {t(HEADERS[c])}
                    <span aria-hidden="true">
                      {sort.column === c ? (sort.descending ? " ↓" : " ↑") : ""}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.name}>
                <th scope="row">
                  <Button
                    variant="quiet"
                    aria-label={t("areas.show", { name: h.name })}
                    onClick={() =>
                      flyTo({ lon: h.center[0], lat: h.center[1] }, 14.5)
                    }
                  >
                    {h.name}
                  </Button>
                </th>
                <td className="num">
                  {t("areas.reachOf", {
                    n: number(h.reachable),
                    total: number(h.cells),
                  })}
                </td>
                <td className="num">
                  {t("areas.walkRange", {
                    a: minutes(h.minWalk),
                    b: minutes(h.medianWalk),
                  })}
                </td>
                {transitOn ? (
                  <td className="num">{minutes(h.minTransit ?? Infinity)}</td>
                ) : null}
                <td className="num">{number(h.violent)}</td>
                <td className="num">{number(h.property)}</td>
                <td className="num">{number(h.encampment)}</td>
                <td className="num">{number(h.dangerCells)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">{t("areas.note")}</p>
    </section>
  );
}
