// Loads the area data and runs commute routing for the current workplace,
// speed and mode. Everything here happens in the browser.
import {
  type ReactNode,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type AreaData,
  type Place,
  cellOfPoint,
  cellPoint,
  loadArea,
  loadPlaces,
} from "../data/area.ts";
import { type HoodSummary, reachableCount, summarize } from "../lib/areas.ts";
import { meters } from "../lib/grid.ts";
import { type Commute, Router } from "../lib/router.ts";
import { useAppState } from "./state.tsx";

export type Status = "loading" | "ready" | "error";

interface DataValue {
  area: AreaData | null;
  areaStatus: Status;
  places: Place[] | null;
  commute: Commute | null;
  commuteStatus: Status;
  /** Minutes to work for a cell by the chosen mode. */
  minutesAt: (cell: number) => number | null;
  walkAt: (cell: number) => number | null;
  transitAt: (cell: number) => number | null;
  reachable: number;
  hoods: HoodSummary[];
  workplaceCell: number;
  retry: () => void;
}

const DataContext = createContext<DataValue | null>(null);

interface Routed {
  key: string;
  commute: Commute | null;
  failed: boolean;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { state } = useAppState();
  const [area, setArea] = useState<AreaData | null>(null);
  const [areaFailed, setAreaFailed] = useState(false);
  const [places, setPlaces] = useState<Place[] | null>(null);

  const fetchData = useCallback(() => {
    loadArea().then(
      (a) => {
        setArea(a);
        setAreaFailed(false);
      },
      () => setAreaFailed(true),
    );
    loadPlaces().then(setPlaces, () => undefined);
  }, []);
  useEffect(fetchData, [fetchData]);

  // The router starts its worker on first use and can restart after dispose.
  const router = useMemo(() => (area ? new Router(area) : null), [area]);
  useEffect(() => () => router?.dispose(), [router]);

  const workplaceCell = useMemo(
    () => (area ? cellOfPoint(area, state.workplace, 1000) : -1),
    [area, state.workplace],
  );

  const transit = state.commute.mode === "walk+muni";
  const speed = state.commute.speed;
  const [retries, setRetries] = useState(0);
  const request = useMemo(() => {
    if (!area || workplaceCell < 0) return null;
    const centre = cellPoint(area, workplaceCell);
    return {
      node: area.cells.node[workplaceCell]!,
      snap: area.cells.snap[workplaceCell]! + meters(state.workplace, centre),
      key: `${workplaceCell}:${state.workplace.lon}:${state.workplace.lat}:${speed}:${transit}:${retries}`,
    };
  }, [area, workplaceCell, state.workplace, speed, transit, retries]);

  const [routed, setRouted] = useState<Routed | null>(null);
  useEffect(() => {
    if (!router || !request) return;
    const { key } = request;
    router.route(request.node, request.snap, speed, transit).then(
      (commute) => setRouted({ key, commute, failed: false }),
      () =>
        setRouted((prev) => ({
          key,
          commute: prev?.commute ?? null,
          failed: true,
        })),
    );
  }, [router, request, speed, transit]);

  const retry = useCallback(() => {
    if (areaFailed) {
      setAreaFailed(false);
      fetchData();
    }
    setRetries((n) => n + 1);
  }, [areaFailed, fetchData]);

  const value = useMemo<DataValue>(() => {
    // Keep showing the previous result while a new one is calculated.
    const commute = routed?.commute ?? null;
    const current = routed !== null && routed.key === request?.key;
    const commuteStatus: Status = !current
      ? "loading"
      : routed.failed
        ? "error"
        : "ready";
    const walk = commute?.walk ?? null;
    const transitMinutes = transit ? (commute?.transit ?? null) : null;
    const max = state.commute.maxMinutes;
    const walkAt = (cell: number) => (walk && cell >= 0 ? walk[cell]! : null);
    const transitAt = (cell: number) =>
      transitMinutes && cell >= 0 ? transitMinutes[cell]! : null;
    return {
      area,
      areaStatus: area ? "ready" : areaFailed ? "error" : "loading",
      places,
      commute,
      commuteStatus,
      walkAt,
      transitAt,
      minutesAt: (cell) => {
        const w = walkAt(cell);
        if (w === null) return null;
        return Math.min(w, transitAt(cell) ?? Infinity);
      },
      reachable: walk ? reachableCount(walk, transitMinutes, max) : 0,
      hoods: area && walk ? summarize(area, walk, transitMinutes, max) : [],
      workplaceCell,
      retry,
    };
  }, [
    area,
    areaFailed,
    places,
    routed,
    request,
    transit,
    state.commute.maxMinutes,
    workplaceCell,
    retry,
  ]);

  return <DataContext value={value}>{children}</DataContext>;
}

export function useData(): DataValue {
  const value = use(DataContext);
  if (!value) throw new Error("useData outside DataProvider");
  return value;
}

/** The data context, or null outside the provider (the welcome screen). */
export function useOptionalData(): DataValue | null {
  return use(DataContext);
}
