import { UNIT_TYPES } from "../../app/model.ts";
import { useAppState } from "../../app/state.tsx";
import { useUi } from "../../app/ui.tsx";
import { BASELINES, RENT_SOURCES } from "../../data/rents.ts";
import {
  Badge,
  type BadgeTone,
  Button,
  SectionLabel,
  Stat,
} from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";
import {
  type Standing,
  ceilings,
  people,
  residual,
  salaryNeeded,
  shareOfGross,
  standing,
} from "../../lib/budget.ts";
import { SalaryInputs, UnitTypeSelect } from "./inputs.tsx";

export const TONE: Record<Standing, BadgeTone> = {
  within: "good",
  near: "near",
  over: "over",
  unknown: "neutral",
};

export function BudgetPanel() {
  const { state, dispatch } = useAppState();
  const { setTab } = useUi();
  const { t, money, percent, date } = useT();
  const profile = state.profile;
  const c = ceilings(profile);
  const n = people(profile);
  const share = (unit: (typeof UNIT_TYPES)[number]) =>
    BASELINES[unit].median / Math.min(n, BASELINES[unit].bedrooms);

  // Worst case: even the cheapest shared option is over the 30% line.
  const cheapestShared = BASELINES["2b2b"].median / 2;
  const overEverything =
    c !== null &&
    c.perPerson.standard < BASELINES.studio.median &&
    c.perPerson.standard < cheapestShared;

  return (
    <>
      <div className="stack">
        <SectionLabel>{t("budget.title")}</SectionLabel>
        <SalaryInputs />
        <UnitTypeSelect
          label={t("budget.unitType")}
          value={profile.unitType}
          onChange={(unitType) =>
            dispatch({ type: "setProfile", profile: { unitType } })
          }
        />
      </div>

      <section className="stack" aria-labelledby="ceiling-title">
        <h2 id="ceiling-title">{t("budget.ceilingTitle")}</h2>
        {c === null ? (
          <p className="note">{t("budget.need")}</p>
        ) : (
          <>
            <div className="grid-2">
              <Stat
                label={t("budget.you")}
                value={t("unit.perMonth", {
                  amount: money(c.perPerson.standard),
                })}
                detail={t("budget.afterUtilities", {
                  amount: money(profile.utilities / n),
                })}
              />
              {n > 1 ? (
                <Stat
                  label={t("budget.household")}
                  value={t("unit.perMonth", {
                    amount: money(c.combined.standard),
                  })}
                  detail={t("budget.afterUtilities", {
                    amount: money(profile.utilities),
                  })}
                />
              ) : null}
              <Stat
                label={t("budget.conservative")}
                value={money(c.perPerson.conservative)}
              />
              <Stat
                label={t("budget.severe")}
                value={money(c.perPerson.severe)}
              />
            </div>
            <p>
              {t("budget.residual", {
                unit: t(`unit.${profile.unitType}`).toLowerCase(),
                amount: money(
                  residual(
                    share(profile.unitType) + profile.utilities / n,
                    profile.salary,
                  ) ?? 0,
                ),
              })}
            </p>
            {n > 1 && profile.roommateSalaries.some((s) => s === null) ? (
              <p className="note">{t("budget.assumption")}</p>
            ) : null}
            {overEverything ? (
              <div className="stack">
                <p>
                  {t("budget.overAll", {
                    ceiling: money(c.perPerson.standard),
                    oneBed: money(BASELINES["1b1b"].median),
                    shared: money(cheapestShared),
                  })}
                </p>
                <div className="row">
                  {profile.roommates < 3 ? (
                    <Button
                      onClick={() =>
                        dispatch({
                          type: "setRoommates",
                          roommates: profile.roommates + 1,
                        })
                      }
                    >
                      {t("budget.addRoommate")}
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => {
                      dispatch({
                        type: "setCommute",
                        commute: {
                          maxMinutes: Math.min(
                            45,
                            state.commute.maxMinutes + 10,
                          ),
                        },
                      });
                      setTab("commute");
                    }}
                  >
                    {t("budget.widen")}
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="stack" aria-labelledby="baseline-title">
        <h2 id="baseline-title">{t("budget.baselines")}</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{t("budget.colUnit")}</th>
                <th scope="col" className="num">
                  {t("budget.colMedian")}
                </th>
                <th scope="col" className="num">
                  {t("budget.colYours")}
                </th>
                <th scope="col">{t("budget.colShare")}</th>
              </tr>
            </thead>
            <tbody>
              {UNIT_TYPES.map((u) => {
                const yours = share(u);
                const s = standing(yours, profile.salary);
                const ratio = shareOfGross(yours, profile.salary);
                return (
                  <tr
                    key={u}
                    className={u === profile.unitType ? "is-current" : ""}
                  >
                    <th scope="row">{t(`unit.${u}`)}</th>
                    <td className="num">{money(BASELINES[u].median)}</td>
                    <td className="num">{money(yours)}</td>
                    <td>
                      <Badge tone={TONE[s]}>
                        {ratio === null
                          ? t("standing.unknown")
                          : `${percent(ratio)} · ${t(`standing.${s}`)}`}
                      </Badge>
                      <br />
                      <span className="note">
                        {t("budget.colSalary")}: {money(salaryNeeded(yours))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          {t("budget.sources", {
            a: RENT_SOURCES.zumper.name,
            dateA: date(RENT_SOURCES.zumper.asOf),
            b: RENT_SOURCES.padmapper.name,
            dateB: date(RENT_SOURCES.padmapper.asOf),
          })}
        </p>
        <p className="note">{t("budget.about")}</p>
      </section>
    </>
  );
}
