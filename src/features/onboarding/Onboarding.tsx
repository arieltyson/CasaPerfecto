import { useId, useState } from "react";
import { useAppState } from "../../app/state.tsx";
import { Button, Panel } from "../../design/components.tsx";
import { type Key, useT } from "../../i18n/i18n.tsx";
import {
  RememberToggle,
  SalaryInputs,
  UnitTypeSelect,
} from "../budget/inputs.tsx";
import {
  CommuteLimit,
  CommuteMode,
  WalkingPace,
  WorkplacePicker,
} from "../commute/controls.tsx";

const STEPS: Key[] = [
  "city.title",
  "workplace.title",
  "commute.title",
  "budget.title",
];

function CityStep() {
  const { t } = useT();
  const sf = useId();
  const more = useId();
  return (
    <fieldset className="choice-list">
      <legend className="visually-hidden">{t("city.legend")}</legend>
      <div className="choice">
        <input id={sf} type="radio" name="city" defaultChecked />
        <label htmlFor={sf}>
          <strong>{t("city.sf")}</strong>
          <br />
          <span className="note">{t("city.sfDetail")}</span>
        </label>
      </div>
      <div className="choice is-disabled">
        <input id={more} type="radio" name="city" disabled />
        <label htmlFor={more}>{t("city.more")}</label>
      </div>
    </fieldset>
  );
}

// Stable across renders: React calls a ref callback again whenever its
// identity changes, and an inline one would pull focus out of the inputs on
// every keystroke.
function focusOnMount(el: HTMLHeadingElement | null) {
  el?.focus();
}

export function Onboarding() {
  const { state, dispatch } = useAppState();
  const { t } = useT();
  const [step, setStep] = useState(0);

  const last = step === STEPS.length - 1;
  return (
    <Panel floating className="onboarding" label={t("onboarding.label")}>
      <div className="stack">
        <p className="steps">
          {t("onboarding.step", { n: step + 1, total: STEPS.length })}
        </p>
        {/* Each step remounts its heading (key) and moves focus to it once,
            so screen readers announce the new step. */}
        <h1 key={step} ref={focusOnMount} tabIndex={-1}>
          {t(STEPS[step]!)}
        </h1>
      </div>

      {step === 0 ? <CityStep /> : null}
      {step === 1 ? <WorkplacePicker /> : null}
      {step === 2 ? (
        <div className="stack">
          <CommuteLimit />
          <CommuteMode />
          <WalkingPace />
        </div>
      ) : null}
      {step === 3 ? (
        <div className="stack">
          <SalaryInputs />
          <UnitTypeSelect
            label={t("budget.unitType")}
            value={state.profile.unitType}
            onChange={(unitType) =>
              dispatch({ type: "setProfile", profile: { unitType } })
            }
          />
          <RememberToggle />
        </div>
      ) : null}

      <div className="onboarding__nav">
        <Button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          {t("common.back")}
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            last
              ? dispatch({ type: "finishOnboarding" })
              : setStep((s) => s + 1)
          }
        >
          {last ? t("onboarding.finish") : t("common.next")}
        </Button>
      </div>
    </Panel>
  );
}
