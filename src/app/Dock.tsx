import { type ReactNode, useRef, useState } from "react";
import { Button, Mark, Panel } from "../design/components.tsx";
import { useT } from "../i18n/i18n.tsx";
import { useData } from "./data.tsx";
import { type Tab, useUi } from "./ui.tsx";

export interface TabDef {
  id: Tab;
  label: string;
  render: () => ReactNode;
}

/** Left panel on wide screens, bottom sheet on phones, with WAI-ARIA tabs. */
export function Dock({ tabs }: { tabs: TabDef[] }) {
  const { tab, setTab, setMethodsOpen } = useUi();
  const { area } = useData();
  const { t, date } = useT();
  const [expanded, setExpanded] = useState(false);
  const refs = useRef(new Map<Tab, HTMLButtonElement>());
  const active = tabs.find((d) => d.id === tab) ?? tabs[0]!;

  const focusTab = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length]!;
    setTab(next.id);
    refs.current.get(next.id)?.focus();
  };

  return (
    <Panel
      floating
      as="aside"
      className={`dock ${expanded ? "is-expanded" : ""}`}
      label={t("app.name")}
    >
      <div className="dock__head">
        <Mark size={32} />
        <div className="dock__brand">
          <strong>{t("app.name")}</strong>
          <span>{t("app.area")}</span>
        </div>
        <Button
          className="dock__handle"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? t("dock.collapse") : t("dock.expand")}
        </Button>
      </div>
      <div role="tablist" aria-label={t("tabs.label")} className="tabs">
        {tabs.map((d, i) => (
          <button
            key={d.id}
            ref={(el) => {
              if (el) refs.current.set(d.id, el);
            }}
            role="tab"
            type="button"
            id={`tab-${d.id}`}
            aria-selected={d.id === active.id}
            aria-controls={`panel-${d.id}`}
            tabIndex={d.id === active.id ? 0 : -1}
            onClick={() => setTab(d.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") focusTab(i + 1);
              else if (e.key === "ArrowLeft") focusTab(i - 1);
              else if (e.key === "Home") focusTab(0);
              else if (e.key === "End") focusTab(tabs.length - 1);
              else return;
              e.preventDefault();
            }}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="dock__body" id="dock-body" tabIndex={-1}>
        <div
          role="tabpanel"
          id={`panel-${active.id}`}
          aria-labelledby={`tab-${active.id}`}
        >
          {active.render()}
        </div>
      </div>
      <div className="dock__foot">
        {area ? (
          <span>{t("dock.dataAsOf", { date: date(area.asOf) })}</span>
        ) : null}
        <Button variant="quiet" onClick={() => setMethodsOpen(true)}>
          {t("welcome.methods")}
        </Button>
      </div>
    </Panel>
  );
}
