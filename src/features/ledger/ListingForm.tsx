import { useId, useState } from "react";
import { useData } from "../../app/data.tsx";
import { FEATURE_IDS, type Listing } from "../../app/model.ts";
import { useAppState } from "../../app/state.tsx";
import { useUi } from "../../app/ui.tsx";
import {
  Button,
  Field,
  MoneyField,
  SectionLabel,
} from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";
import { UnitTypeSelect } from "../budget/inputs.tsx";

export function newListing(unitType: Listing["unitType"]): Listing {
  return {
    id: crypto.randomUUID(),
    address: "",
    location: null,
    unitType,
    baseRent: 0,
    utilities: 0,
    parking: 0,
    fees: 0,
    concession: 0,
    features: [],
    notes: "",
  };
}

export function ListingForm({
  initial,
  onDone,
}: {
  initial: Listing;
  onDone: () => void;
}) {
  const { dispatch, state } = useAppState();
  const { places } = useData();
  const { startPick, flyTo } = useUi();
  const { t } = useT();
  const [draft, setDraft] = useState(initial);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listId = useId();
  const notesId = useId();
  const isNew = !state.listings.some((l) => l.id === initial.id);
  const set = (patch: Partial<Listing>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const applyIntersection = (name: string) => {
    const place = places?.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!place) return;
    set({ location: { lon: place.lon, lat: place.lat } });
    flyTo(place, 15.5);
  };

  return (
    <form
      className="stack"
      aria-labelledby="listing-form-title"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.baseRent <= 0) {
          setError(t("form.needRent"));
          return;
        }
        dispatch({ type: "saveListing", listing: draft });
        onDone();
      }}
    >
      <h2 id="listing-form-title">
        {isNew ? t("form.titleNew") : t("form.titleEdit")}
      </h2>
      <Field
        label={t("form.address")}
        hint={t("form.addressHint")}
        value={draft.address}
        maxLength={200}
        onChange={(e) => set({ address: e.target.value })}
      />

      <div className="stack">
        <SectionLabel>{t("form.location")}</SectionLabel>
        <p className="note">
          {draft.location ? t("form.locationSet") : t("form.locationNone")}
        </p>
        <Field
          label={t("form.intersection")}
          hint={t("workplace.searchHint")}
          list={listId}
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            applyIntersection(e.target.value);
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
          <Button
            onClick={() =>
              startPick({
                purpose: "listing",
                onPick: (point) => set({ location: point }),
              })
            }
          >
            {t("form.pick")}
          </Button>
        </div>
      </div>

      <UnitTypeSelect
        label={t("budget.unitType")}
        value={draft.unitType}
        onChange={(unitType) => set({ unitType })}
      />
      <div className="grid-2">
        <MoneyField
          label={t("form.baseRent")}
          value={draft.baseRent || null}
          onValue={(v) => set({ baseRent: v ?? 0 })}
        />
        <MoneyField
          label={t("form.utilities")}
          value={draft.utilities || null}
          onValue={(v) => set({ utilities: v ?? 0 })}
        />
        <MoneyField
          label={t("form.parking")}
          value={draft.parking || null}
          onValue={(v) => set({ parking: v ?? 0 })}
        />
        <MoneyField
          label={t("form.fees")}
          value={draft.fees || null}
          onValue={(v) => set({ fees: v ?? 0 })}
        />
      </div>
      <MoneyField
        label={t("form.concession")}
        hint={t("form.concessionHint")}
        value={draft.concession || null}
        onValue={(v) => set({ concession: v ?? 0 })}
      />

      <fieldset className="checks">
        <legend className="segmented__legend">{t("form.features")}</legend>
        {FEATURE_IDS.map((f) => (
          <label key={f}>
            <input
              type="checkbox"
              checked={draft.features.includes(f)}
              onChange={(e) =>
                set({
                  features: e.target.checked
                    ? [...draft.features, f]
                    : draft.features.filter((x) => x !== f),
                })
              }
            />
            {t(`feature.${f}`)}
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label htmlFor={notesId}>{t("form.notes")}</label>
        <textarea
          id={notesId}
          className="textarea"
          maxLength={2000}
          value={draft.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>

      {error ? <p role="alert">{error}</p> : null}
      <div className="row">
        <Button type="submit" variant="primary">
          {t("common.save")}
        </Button>
        <Button onClick={onDone}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}
