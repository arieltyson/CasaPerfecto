// Transient interface state that is not saved: the selected cell, map picking,
// camera requests, the open tab and screen reader announcements.
import {
  type ReactNode,
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { Point } from "./model.ts";

export type Tab =
  "commute" | "budget" | "preferences" | "listings" | "areas" | "settings";

export interface PickRequest {
  purpose: "workplace" | "listing";
  onPick: (point: Point) => void;
}

export interface FlyTarget extends Point {
  zoom?: number;
  key: number;
}

interface UiValue {
  tab: Tab;
  setTab: (tab: Tab) => void;
  selectedCell: number | null;
  setSelectedCell: (cell: number | null) => void;
  pick: PickRequest | null;
  startPick: (request: PickRequest) => void;
  cancelPick: () => void;
  fly: FlyTarget | null;
  flyTo: (point: Point, zoom?: number) => void;
  methodsOpen: boolean;
  setMethodsOpen: (open: boolean) => void;
  announcement: string;
  announce: (text: string) => void;
}

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>("commute");
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [pick, setPick] = useState<PickRequest | null>(null);
  const [fly, setFly] = useState<FlyTarget | null>(null);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const startPick = useCallback((request: PickRequest) => {
    setPick({
      purpose: request.purpose,
      onPick: (point) => {
        setPick(null);
        request.onPick(point);
      },
    });
  }, []);
  const cancelPick = useCallback(() => setPick(null), []);
  const flyTo = useCallback((point: Point, zoom?: number) => {
    setFly((prev) => ({
      ...point,
      ...(zoom === undefined ? {} : { zoom }),
      key: (prev?.key ?? 0) + 1,
    }));
  }, []);

  const value = useMemo(
    () => ({
      tab,
      setTab,
      selectedCell,
      setSelectedCell,
      pick,
      startPick,
      cancelPick,
      fly,
      flyTo,
      methodsOpen,
      setMethodsOpen,
      announcement,
      announce: setAnnouncement,
    }),
    [
      tab,
      selectedCell,
      pick,
      startPick,
      cancelPick,
      fly,
      flyTo,
      methodsOpen,
      announcement,
    ],
  );
  return <UiContext value={value}>{children}</UiContext>;
}

export function useUi(): UiValue {
  const value = use(UiContext);
  if (!value) throw new Error("useUi outside UiProvider");
  return value;
}
