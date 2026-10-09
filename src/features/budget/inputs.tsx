import { useId } from "react";
import { UNIT_TYPES, type UnitType } from "../../app/model.ts";
import { useAppState } from "../../app/state.tsx";
import { MoneyField, Segmented, Toggle } from "../../design/components.tsx";
import { useT } from "../../i18n/i18n.tsx";

export function SalaryInputs() {
  const { state, dispatch } = useAppState();
  const { t } = useT();
  const p = state.profile;
  return (
    <div className="stack">
      <MoneyField
        label={t("budget.salary")}
        hint={t("budget.salaryHint")}
        value={p.salary}
        onValue={(salary) =>
          dispatch({ type: "setProfile", profile: { salary } })
        }
      />
      <Segmented
        legend={t("budget.roommates")}
        value={p.roommates}
        onChange={(roommates) => dispatch({ type: "setRoommates", roommates })}
        options={[0, 1, 2, 3].map((n) => ({
          value: n,
          label: n === 0 ? t("budget.roommatesNone") : String(n),
        }))}
      />
      {p.roommateSalaries.map((salary, index) => (
        <MoneyField
          key={index}
          label={t("budget.roommateSalary", { n: index + 1 })}
          hint={t("budget.roommateHint")}
          value={salary}
          onValue={(value) =>
            dispatch({ type: "setRoommateSalary", index, salary: value })
          }
        />
      ))}
      <MoneyField
        label={t("budget.utilities")}
        hint={t("budget.utilitiesHint")}
        value={p.utilities}
        onValue={(utilities) =>
          dispatch({
            type: "setProfile",
            profile: { utilities: utilities ?? 0 },
          })
        }
      />
    </div>
  );
}

export function UnitTypeSelect({
  value,
  onChange,
  label,
}: {
  value: UnitType;
  onChange: (unit: UnitType) => void;
  label: string;
}) {
  const { t } = useT();
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value as UnitType)}
      >
        {UNIT_TYPES.map((u) => (
          <option key={u} value={u}>
            {t(`unit.${u}`)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RememberToggle() {
  const { state, dispatch } = useAppState();
  const { t } = useT();
  return (
    <Toggle
      label={t("privacy.remember")}
      hint={t("privacy.rememberHint")}
      checked={state.settings.remember}
      onChange={(remember) =>
        dispatch({ type: "setSettings", settings: { remember } })
      }
    />
  );
}
