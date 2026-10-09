import { useEffect, useMemo, useState } from "react";
import { STALE_AFTER_DAYS, dataAgeDays } from "../data/area.ts";
import { Button, Panel } from "../design/components.tsx";
import { useResolvedAppearance } from "../design/hooks.ts";
import { BudgetPanel } from "../features/budget/BudgetPanel.tsx";
import { CommutePanel } from "../features/commute/CommutePanel.tsx";
import { MapArea } from "../features/map/MapArea.tsx";
import { Rail } from "../features/map/Rail.tsx";
import { Methods } from "../features/methods/Methods.tsx";
import { Onboarding } from "../features/onboarding/Onboarding.tsx";
import { Welcome } from "../features/onboarding/Welcome.tsx";
import { Unlock } from "../features/settings/Unlock.tsx";
import { I18nProvider, useT } from "../i18n/i18n.tsx";
import { DataProvider, useData } from "./data.tsx";
import { type TabDef, Dock } from "./Dock.tsx";
import { StateProvider, useAppState } from "./state.tsx";
import { UiProvider, useUi } from "./ui.tsx";

export function App() {
  return (
    <StateProvider>
      <Localized />
    </StateProvider>
  );
}

function Localized() {
  const { state, locked } = useAppState();
  useResolvedAppearance(state.settings.appearance);
  return (
    <I18nProvider language={state.settings.language}>
      <UiProvider>{locked ? <Unlock /> : <Main />}</UiProvider>
    </I18nProvider>
  );
}

function Main() {
  const { state } = useAppState();
  const { methodsOpen, setMethodsOpen } = useUi();
  const [started, setStarted] = useState(state.onboarded);
  return (
    <>
      {started || state.onboarded ? (
        <DataProvider>
          <Shell />
        </DataProvider>
      ) : (
        <Welcome
          onStart={() => setStarted(true)}
          onMethods={() => setMethodsOpen(true)}
        />
      )}
      {methodsOpen ? <Methods onClose={() => setMethodsOpen(false)} /> : null}
    </>
  );
}

function Shell() {
  const { state } = useAppState();
  const { t } = useT();
  const tabs = useMemo<TabDef[]>(
    () => [
      {
        id: "commute",
        label: t("tabs.commute"),
        render: () => <CommutePanel />,
      },
      { id: "budget", label: t("tabs.budget"), render: () => <BudgetPanel /> },
    ],
    [t],
  );
  return (
    <div className="app">
      <a className="skip-link" href="#dock-body">
        {t("skip.main")}
      </a>
      <MapArea />
      {state.onboarded ? (
        <>
          <Dock tabs={tabs} />
          <Rail />
        </>
      ) : (
        <Onboarding />
      )}
      <Banners />
      <PickHint />
      <LiveRegion />
    </div>
  );
}

function Banners() {
  const { storageOk } = useAppState();
  const { area, areaStatus, retry } = useData();
  const { t } = useT();
  const [dismissed, setDismissed] = useState(false);
  const age = area ? dataAgeDays(area.asOf) : 0;
  let message: string | null = null;
  if (areaStatus === "error") message = t("area.error");
  else if (!storageOk) message = t("banner.storage");
  else if (age > STALE_AFTER_DAYS) message = t("banner.stale", { days: age });
  if (!message || (dismissed && areaStatus !== "error")) return null;
  return (
    <Panel floating className="banner" as="div">
      <output>{message}</output>
      {areaStatus === "error" ? (
        <Button onClick={retry}>{t("common.retry")}</Button>
      ) : (
        <Button onClick={() => setDismissed(true)}>
          {t("banner.dismiss")}
        </Button>
      )}
    </Panel>
  );
}

function PickHint() {
  const { pick, cancelPick } = useUi();
  const { t } = useT();
  if (!pick) return null;
  return (
    <Panel floating className="pick-hint" as="div">
      <output>
        {pick.purpose === "workplace" ? t("pick.workplace") : t("pick.listing")}
      </output>
      <Button onClick={cancelPick}>{t("common.cancel")}</Button>
    </Panel>
  );
}

/** Announces recalculated results to screen readers. */
function LiveRegion() {
  const { state } = useAppState();
  const { reachable, commuteStatus } = useData();
  const { announcement, announce } = useUi();
  const { t, number } = useT();
  const max = state.commute.maxMinutes;
  useEffect(() => {
    if (commuteStatus !== "ready") return;
    const timer = setTimeout(
      () => announce(t("live.reachable", { n: number(reachable), max })),
      600,
    );
    return () => clearTimeout(timer);
  }, [reachable, max, commuteStatus, announce, t, number]);
  return (
    <output className="visually-hidden" aria-live="polite">
      {announcement}
    </output>
  );
}
