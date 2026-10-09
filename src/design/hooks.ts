import { useEffect, useSyncExternalStore } from "react";
import type { Appearance } from "../app/model.ts";

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

/** Every animation goes through this, so reduced motion cannot be missed. */
export function useReducedMotion(): boolean {
  return useMedia("(prefers-reduced-motion: reduce)");
}

export function motionMs(ms: number, reduced: boolean): number {
  return reduced ? 0 : ms;
}

export function useHighContrast(): boolean {
  return useMedia("(prefers-contrast: more)");
}

/** The appearance actually in effect, and the root attribute that pins it. */
export function useResolvedAppearance(setting: Appearance): "light" | "dark" {
  const systemDark = useMedia("(prefers-color-scheme: dark)");
  useEffect(() => {
    const root = document.documentElement;
    if (setting === "system") delete root.dataset["appearance"];
    else root.dataset["appearance"] = setting;
  }, [setting]);
  if (setting === "system") return systemDark ? "dark" : "light";
  return setting;
}

export function useNarrow(): boolean {
  return useMedia("(max-width: 760px)");
}
