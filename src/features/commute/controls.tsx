import { useId, useState } from "react";
import {
  DEFAULT_WORKPLACE,
  MAX_COMMUTE,
  MIN_COMMUTE,
  SPEEDS,
} from "../../app/model.ts";
import { useAppState } from "../../app/state.tsx";
import { useUi } from "../../app/ui.tsx";
import { useData } from "../../app/data.tsx";
import { cellOfPoint } from "../../data/area.ts";
import { Button, Field, Segmented } from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";

const STEP = 5;

export function CommuteLimit() {
  const { state, dispatch } = useAppState();
  const { t } = useT();
  const id = useId();
  const value = state.commute.maxMinutes;
  const set = (minutes: number) =>
    dispatch({
      type: "setCommute",
      commute: {
        maxMinutes: Math.max(MIN_COMMUTE, Math.min(MAX_COMMUTE, minutes)),
      },
    });
  return (
    <div className="field">
      <label htmlFor={id}>{t("commute.maxLabel")}</label>
      <div className="row">
        <Button
          aria-label={t("commute.shorter")}
          disabled={value <= MIN_COMMUTE}
          onClick={() => set(value - STEP)}
        >
          −
        </Button>
        <input
          id={id}
          type="range"
          min={MIN_COMMUTE}
          max={MAX_COMMUTE}
          step={STEP}
          value={value}
          aria-valuetext={t("commute.maxValue", { n: value })}
          onChange={(e) => set(Number(e.target.value))}
          className="range"
        />
        <Button
          aria-label={t("commute.longer")}
          disabled={value >= MAX_COMMUTE}
          onClick={() => set(value + STEP)}
        >
          +
        </Button>
        <output htmlFor={id} className="range__value">
          {t("commute.maxValue", { n: value })}
        </output>
      </div>
    </div>
  );
}

export function CommuteMode() {
  const { state, dispatch } = useAppState();
  const { t } = useT();
  return (
    <Segmented
      legend={t("commute.mode")}
      value={state.commute.mode}
      onChange={(mode) => dispatch({ type: "setCommute", commute: { mode } })}
      options={[
        { value: "walk", label: t("commute.walk") },
        { value: "walk+muni", label: t("commute.muni") },
      ]}
      {...(state.commute.mode === "walk+muni"
        ? { hint: t("commute.muniHint") }
        : {})}
    />
  );
}

export function WalkingPace() {
  const { state, dispatch } = useAppState();
  const { t } = useT();
  const labels = [
    t("commute.speedRelaxed"),
    t("commute.speedEasy"),
    t("commute.speedTypical"),
    t("commute.speedBrisk"),
  ];
  return (
    <Segmented
      legend={t("commute.speed")}
      value={state.commute.speed}
      onChange={(speed) => dispatch({ type: "setCommute", commute: { speed } })}
      options={SPEEDS.map((speed, i) => ({ value: speed, label: labels[i]! }))}
      hint={t("commute.speedHint")}
    />
  );
}

type WorkplaceChoice = "default" | "search" | "map";

export function WorkplacePicker() {
  const { state, dispatch } = useAppState();
  const { area, places } = useData();
  const { startPick, flyTo } = useUi();
  const { t } = useT();
  const isDefault =
    state.workplace.lon === DEFAULT_WORKPLACE.lon &&
    state.workplace.lat === DEFAULT_WORKPLACE.lat;
  const [choice, setChoice] = useState<WorkplaceChoice>(
    isDefault ? "default" : "search",
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listId = useId();

  const applyIntersection = () => {
    const place = places?.find(
      (p) => p.name.toLowerCase() === query.trim().toLowerCase(),
    );
    if (!place) {
      setError(t("workplace.notFound"));
      return;
    }
    setError(null);
    dispatch({
      type: "setWorkplace",
      workplace: { label: place.name, lon: place.lon, lat: place.lat },
    });
    flyTo(place, 15);
  };

  return (
    <div className="stack">
      <fieldset className="choice-list">
        <legend className="visually-hidden">{t("workplace.legend")}</legend>
        <label className="choice">
          <input
            type="radio"
            name="workplace"
            checked={choice === "default"}
            onChange={() => {
              setChoice("default");
              setError(null);
              dispatch({
                type: "setWorkplace",
                workplace: { ...DEFAULT_WORKPLACE },
              });
              flyTo(DEFAULT_WORKPLACE, 15);
            }}
          />
          {t("workplace.default")}
        </label>
        <label className="choice">
          <input
            type="radio"
            name="workplace"
            checked={choice === "search"}
            onChange={() => setChoice("search")}
          />
          {t("workplace.search")}
        </label>
        <label className="choice">
          <input
            type="radio"
            name="workplace"
            checked={choice === "map"}
            onChange={() => setChoice("map")}
          />
          {t("workplace.pick")}
        </label>
      </fieldset>

      {choice === "search" ? (
        <div className="stack">
          <Field
            label={t("workplace.searchLabel")}
            hint={t("workplace.searchHint")}
            list={listId}
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyIntersection();
            }}
          />
          <datalist id={listId}>
            {places?.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </datalist>
          <div>
            <Button onClick={applyIntersection} disabled={!places}>
              {t("workplace.searchUse")}
            </Button>
          </div>
        </div>
      ) : null}

      {choice === "map" ? (
        <div>
          <Button
            disabled={!area}
            onClick={() =>
              startPick({
                purpose: "workplace",
                onPick: (point) => {
                  if (!area || cellOfPoint(area, point, 150) < 0) {
                    setError(t("workplace.outside"));
                    return;
                  }
                  setError(null);
                  dispatch({
                    type: "setWorkplace",
                    workplace: { ...point, label: t("workplace.pinned") },
                  });
                },
              })
            }
          >
            {t("workplace.pick")}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="field__hint">
          {error}
        </p>
      ) : null}
      <p className="note" aria-live="polite">
        {t("workplace.current", { label: state.workplace.label })}
      </p>
    </div>
  );
}
