// Share links keep choices in the URL fragment (after #), which browsers never
// send to the server. Salary and listings are left out unless the renter opts
// in to sharing their budget.
import type { AppState } from "../app/model.ts";
import { parseState } from "../app/parse.ts";

export const PARAM = "s";

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const b64 = text.replaceAll("-", "+").replaceAll("_", "/");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function sharedSubset(state: AppState) {
  const subset: Record<string, unknown> = {
    workplace: state.workplace,
    commute: state.commute,
    preferences: state.preferences,
    layers: state.layers,
    profile: {
      unitType: state.profile.unitType,
      roommates: state.profile.roommates,
    },
  };
  if (state.settings.shareBudget) {
    subset["profile"] = {
      ...state.profile,
      roommateSalaries: state.profile.roommateSalaries,
    };
    subset["listings"] = state.listings;
  }
  return subset;
}

export function encodeShare(state: AppState): string {
  return `${PARAM}=${toBase64Url(JSON.stringify(sharedSubset(state)))}`;
}

/** Merges a shared fragment into the current state, or returns null. */
export function decodeShare(hash: string, current: AppState): AppState | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const value = params.get(PARAM);
  if (!value) return null;
  try {
    const shared = JSON.parse(fromBase64Url(value)) as Record<string, unknown>;
    const sharedProfile = (shared["profile"] ?? {}) as Record<string, unknown>;
    return parseState({
      ...current,
      ...shared,
      profile: { ...current.profile, ...sharedProfile },
      settings: current.settings,
      onboarded: true,
    });
  } catch {
    return null;
  }
}
