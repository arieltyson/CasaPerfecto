import { useState } from "react";
import { useData } from "../../app/data.tsx";
import type { Shade } from "../../app/model.ts";
import { useAppState } from "../../app/state.tsx";
import { useUi } from "../../app/ui.tsx";
import { BASELINES } from "../../data/rents.ts";
import {
  Button,
  Panel,
  SectionLabel,
  Segmented,
  Toggle,
} from "../../design/components.tsx";
import { useResolvedAppearance } from "../../design/hooks.ts";
import { RAMPS } from "../../design/tokens.ts";
import { useT } from "../../i18n/i18n.tsx";

/** Right rail: layer choices, the legend and the selected block. */
export function Rail() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const { selectedCell } = useUi();
  return (
    <div className={`rail ${open ? "" : "is-collapsed"}`}>
      <Button
        className="rail__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? t("rail.hide") : t("rail.show")}
      </Button>
      <LayerPanel />
      <Legend />
      {selectedCell !== null ? <CellDetail cell={selectedCell} /> : null}
    </div>
  );
}

function LayerPanel() {
  const { state, dispatch } = useAppState();
  const { setMethodsOpen } = useUi();
  const { t } = useT();
  const set = (layers: Partial<typeof state.layers>) =>
    dispatch({ type: "setLayers", layers });
  return (
    <Panel floating label={t("layers.title")}>
      <div className="stack">
        <SectionLabel>{t("layers.title")}</SectionLabel>
        <Segmented<Shade>
          legend={t("layers.shade")}
          value={state.layers.shade}
          onChange={(shade) => set({ shade })}
          options={[
            { value: "commute", label: t("layers.shadeCommute") },
            { value: "violent", label: t("layers.shadeViolent") },
            { value: "property", label: t("layers.shadeProperty") },
          ]}
        />
        <Toggle
          label={t("layers.danger")}
          hint={t("layers.dangerHint")}
          checked={state.layers.danger}
          onChange={(danger) => set({ danger })}
        />
        <Toggle
          label={t("layers.encampment")}
          hint={t("layers.encampmentHint")}
          checked={state.layers.encampment}
          onChange={(encampment) => set({ encampment })}
        />
        <div>
          <Button variant="quiet" onClick={() => setMethodsOpen(true)}>
            {t("layers.methods")}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function Legend() {
  const { state } = useAppState();
  const { area } = useData();
  const { t, number } = useT();
  const appearance = useResolvedAppearance(state.settings.appearance);
  const shade = state.layers.shade;
  const max = state.commute.maxMinutes;
  let title: string;
  let colors: readonly string[];
  let labels: string[];
  if (shade === "commute") {
    title = t("legend.commute");
    colors = appearance === "light" ? RAMPS.commuteLight : RAMPS.commuteDark;
    // Ramp order is least to most notable; the shortest walk is most notable.
    const step = max / 5;
    labels = [5, 4, 3, 2, 1].map((k) => `≤${number(step * k)}`);
  } else {
    title = shade === "violent" ? t("legend.violent") : t("legend.property");
    colors =
      appearance === "light" ? RAMPS.incidentsLight : RAMPS.incidentsDark;
    const limits = area?.limits[shade] ?? [0, 0, 0];
    const range = (a: number, b: number) =>
      a >= b
        ? t("legend.single", { a: number(b) })
        : t("legend.range", { a: number(a), b: number(b) });
    labels = [
      t("legend.none"),
      range(1, limits[0]),
      range(limits[0] + 1, limits[1]),
      range(limits[1] + 1, limits[2]),
      t("legend.plus", { a: number(limits[2] + 1) }),
    ];
  }
  return (
    <Panel floating label={t("legend.title")}>
      <SectionLabel>{title}</SectionLabel>
      <div className="legend-ramp" aria-hidden="true">
        {colors.map((c) => (
          <span key={c} style={{ background: c }} />
        ))}
      </div>
      <ul className="legend-labels" aria-label={title}>
        {labels.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="note">
        {shade === "commute" ? t("legend.over", { max }) : t("legend.outside")}
      </p>
      {state.layers.danger ? (
        <p className="legend-key">
          <span className="swatch-dash" aria-hidden="true" />
          {t("legend.danger")}
        </p>
      ) : null}
      {state.layers.encampment ? (
        <p className="legend-key">
          <span className="swatch-dot" aria-hidden="true" />
          {t("legend.encampment")}
        </p>
      ) : null}
    </Panel>
  );
}

function CellDetail({ cell }: { cell: number }) {
  const { state } = useAppState();
  const { area, walkAt, transitAt } = useData();
  const { setSelectedCell } = useUi();
  const { t, minutes, number, money } = useT();
  if (!area) return null;
  const c = area.cells;
  const transit = transitAt(cell);
  const unit = state.profile.unitType;
  return (
    <Panel floating label={t("cell.title")}>
      <div className="stack">
        <div className="dialog__head">
          <div>
            <SectionLabel>{t("cell.title")}</SectionLabel>
            <p>{t("cell.near", { hood: area.hoods[c.hood[cell]!] ?? "" })}</p>
          </div>
          <Button
            aria-label={t("cell.close")}
            onClick={() => setSelectedCell(null)}
          >
            ×
          </Button>
        </div>
        <dl className="facts">
          <dt>{t("cell.walk")}</dt>
          <dd>{minutes(walkAt(cell) ?? Infinity)}</dd>
          {transit !== null ? (
            <>
              <dt>{t("cell.muni")}</dt>
              <dd>{minutes(transit)}</dd>
            </>
          ) : null}
          <dt>{t("cell.violent")}</dt>
          <dd>{t("cell.reported", { n: number(c.violent[cell]!) })}</dd>
          <dt>{t("cell.property")}</dt>
          <dd>{t("cell.reported", { n: number(c.property[cell]!) })}</dd>
          <dt>{t("cell.encampment")}</dt>
          <dd>{t("cell.reported", { n: number(c.encampment[cell]!) })}</dd>
        </dl>
        {c.danger[cell] === 1 ? (
          <p className="note">{t("cell.danger")}</p>
        ) : null}
        <p className="note">
          {t("cell.rent", {
            unit: t(`unit.${unit}`).toLowerCase(),
            amount: money(BASELINES[unit].median),
          })}
        </p>
      </div>
    </Panel>
  );
}
