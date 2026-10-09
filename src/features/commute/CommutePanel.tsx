import { useData } from "../../app/data.tsx";
import { SectionLabel, Stat } from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";
import { useAppState } from "../../app/state.tsx";
import {
  CommuteLimit,
  CommuteMode,
  WalkingPace,
  WorkplacePicker,
} from "./controls.tsx";

export function CommutePanel() {
  const { state } = useAppState();
  const { area, reachable, commuteStatus } = useData();
  const { t, number } = useT();
  return (
    <>
      <div className="stack">
        <SectionLabel>{t("commute.workplace")}</SectionLabel>
        <WorkplacePicker />
      </div>
      <div className="stack">
        <SectionLabel>{t("commute.title")}</SectionLabel>
        <CommuteLimit />
        <CommuteMode />
        <WalkingPace />
      </div>
      {commuteStatus === "loading" ? (
        <output className="note">{t("commute.loading")}</output>
      ) : commuteStatus === "error" ? (
        <p role="alert">{t("commute.error")}</p>
      ) : area ? (
        <Stat
          label={t("commute.reach")}
          value={t("commute.reachValue", {
            n: number(reachable),
            total: number(area.cells.index.length),
          })}
          detail={t("commute.maxValue", { n: state.commute.maxMinutes })}
        />
      ) : null}
    </>
  );
}
