import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useData } from "../../app/data.tsx";
import { useAppState } from "../../app/state.tsx";
import { useUi } from "../../app/ui.tsx";
import {
  useHighContrast,
  useReducedMotion,
  useResolvedAppearance,
} from "../../design/hooks.ts";
import { useT } from "../../i18n/i18n.tsx";
import { rankListings } from "../../lib/budget.ts";
import { cellOfPoint } from "../../data/area.ts";

const MapView = lazy(() => import("./MapView.tsx"));

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function MapArea() {
  const { state } = useAppState();
  const data = useData();
  const ui = useUi();
  const { t, number } = useT();
  const appearance = useResolvedAppearance(state.settings.appearance);
  const highContrast = useHighContrast();
  const reducedMotion = useReducedMotion();
  const [supported] = useState(webglAvailable);
  const [failed, setFailed] = useState(false);

  const padding = usePanelPadding(state.onboarded);
  const { area, commute, walkAt } = data;
  const markers = useMemo(() => {
    if (!area) return [];
    const ranked = rankListings(
      state.listings,
      state.profile,
      state.preferences,
      (l) => (l.location ? walkAt(cellOfPoint(area, l.location)) : null),
    );
    return ranked.flatMap((r, i) =>
      r.listing.location
        ? [{ ...r.listing.location, label: String(i + 1) }]
        : [],
    );
  }, [area, state.listings, state.profile, state.preferences, walkAt]);

  if (!supported || failed) {
    return (
      <div className="map-host map-fallback">
        <p>{supported ? t("map.loadError") : t("map.noWebgl")}</p>
      </div>
    );
  }
  if (!area) return <div className="map-host" />;

  const label = t("map.summary", {
    n: number(data.reachable),
    max: state.commute.maxMinutes,
    place: state.workplace.label,
  });

  return (
    <Suspense fallback={<div className="map-host" />}>
      <MapView
        area={area}
        appearance={appearance}
        highContrast={highContrast}
        walk={commute?.walk ?? null}
        transit={
          state.commute.mode === "walk+muni" ? (commute?.transit ?? null) : null
        }
        maxMinutes={state.commute.maxMinutes}
        layers={state.layers}
        workplace={state.workplace}
        listings={markers}
        selectedCell={ui.selectedCell}
        picking={ui.pick !== null}
        fly={ui.fly}
        reducedMotion={reducedMotion}
        padding={padding}
        label={label}
        onSelectCell={ui.setSelectedCell}
        onPick={(point) => ui.pick?.onPick(point)}
        onError={() => setFailed(true)}
      />
    </Suspense>
  );
}

type Padding = { top: number; right: number; bottom: number; left: number };
const NO_PADDING: Padding = { top: 0, right: 0, bottom: 0, left: 0 };

/** Measures the dock and rail so the map keeps its focus in the open space. */
function usePanelPadding(onboarded: boolean): Padding {
  const [padding, setPadding] = useState<Padding>(NO_PADDING);
  // Re-measure when onboarding hands over to the dock.
  useEffect(() => {
    const layout = onboarded ? ".dock" : ".onboarding";
    const measure = () => {
      const dock = document.querySelector(layout);
      const rail = document.querySelector(".rail");
      const w = innerWidth;
      const h = innerHeight;
      const next = { ...NO_PADDING };
      const d = dock?.getBoundingClientRect();
      if (d && d.width < w * 0.9) next.left = Math.round(d.right);
      else if (d) next.bottom = Math.round(h - d.top);
      const r = rail?.getBoundingClientRect();
      if (r && r.width < w * 0.5) next.right = Math.round(w - r.left);
      setPadding((prev) =>
        prev.left === next.left &&
        prev.right === next.right &&
        prev.bottom === next.bottom
          ? prev
          : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    for (const el of document.querySelectorAll(".dock, .onboarding, .rail")) {
      observer.observe(el);
    }
    measure();
    return () => observer.disconnect();
  }, [onboarded]);
  return padding;
}
