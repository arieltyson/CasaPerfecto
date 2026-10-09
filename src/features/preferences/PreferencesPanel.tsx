import { MAX_MUST_HAVES, type Tier } from "../../app/model.ts";
import { mustHaveCount } from "../../app/reducer.ts";
import { useAppState } from "../../app/state.tsx";
import { MoneyField, Segmented } from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";

export function PreferencesPanel() {
  const { state, dispatch } = useAppState();
  const { t } = useT();
  const count = mustHaveCount(state);
  const full = count >= MAX_MUST_HAVES;
  const names = (tier: Tier) =>
    state.preferences
      .filter((p) => p.tier === tier)
      .map((p) => t(`feature.${p.feature}`))
      .join(", ") || t("prefs.none");

  return (
    <section className="stack" aria-labelledby="prefs-title">
      <h2 id="prefs-title">{t("prefs.title")}</h2>
      <p className="note">{t("prefs.intro")}</p>
      <output className="stat__value">
        {t("prefs.count", { n: count, max: MAX_MUST_HAVES })}
      </output>
      {full ? (
        <p className="note">{t("prefs.full", { max: MAX_MUST_HAVES })}</p>
      ) : null}
      <div>
        {state.preferences.map((p) => (
          <div key={p.feature} className="feature-row">
            <Segmented<Tier>
              legend={t(`feature.${p.feature}`)}
              value={p.tier}
              onChange={(tier) =>
                dispatch({ type: "setTier", feature: p.feature, tier })
              }
              options={[
                {
                  value: "must",
                  label: t("prefs.must"),
                  disabled: full && p.tier !== "must",
                },
                { value: "nice", label: t("prefs.nice") },
                { value: "without", label: t("prefs.without") },
              ]}
            />
            {p.tier === "nice" ? (
              <MoneyField
                label={t("prefs.value")}
                value={p.valuePerMonth}
                onValue={(v) =>
                  dispatch({
                    type: "setValue",
                    feature: p.feature,
                    valuePerMonth: v ?? 0,
                  })
                }
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="stack">
        <p>{t("prefs.summaryMust", { list: names("must") })}</p>
        <p>{t("prefs.summaryNice", { list: names("nice") })}</p>
      </div>
    </section>
  );
}
