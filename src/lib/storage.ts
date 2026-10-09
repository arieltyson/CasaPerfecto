// Where AppState lives in the browser. By default it is kept in
// sessionStorage, which the browser clears when the tab closes. Only when the
// renter turns on "Remember on this device" is it written to localStorage,
// optionally sealed with a passphrase. Nothing is ever sent anywhere.
import type { AppState } from "../app/model.ts";
import { parseState } from "../app/parse.ts";
import { type Sealed, open, seal } from "./crypto.ts";

export const KEY = "casaperfecto:state";

type Stored = { kind: "plain"; state: unknown } | ({ kind: "sealed" } & Sealed);

export type Loaded =
  | { status: "empty" }
  | { status: "ready"; state: AppState }
  | { status: "locked"; sealed: Sealed };

function read(storage: Storage | undefined): Stored | null {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function session(): Storage | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

function local(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function load(): Loaded {
  const stored = read(session()) ?? read(local());
  if (!stored) return { status: "empty" };
  if (stored.kind === "sealed") {
    return {
      status: "locked",
      sealed: { salt: stored.salt, iv: stored.iv, data: stored.data },
    };
  }
  return { status: "ready", state: parseState(stored.state) };
}

export async function unlock(
  key: CryptoKey,
  sealed: Sealed,
): Promise<AppState> {
  return parseState(JSON.parse(await open(key, sealed)));
}

export interface Lock {
  key: CryptoKey;
  salt: Uint8Array;
}

/**
 * Writes the state to the store the renter chose and removes it from the
 * other one. Returns false when storage is unavailable or full.
 */
export async function save(
  state: AppState,
  lock: Lock | null,
): Promise<boolean> {
  const remember = state.settings.remember;
  const target = remember ? local() : session();
  const other = remember ? session() : local();
  if (!target) return false;
  try {
    const stored: Stored =
      remember && lock
        ? {
            kind: "sealed",
            ...(await seal(lock.key, lock.salt, JSON.stringify(state))),
          }
        : { kind: "plain", state };
    target.setItem(KEY, JSON.stringify(stored));
    other?.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearAll() {
  try {
    session()?.removeItem(KEY);
  } catch {
    // Storage may be blocked; there is nothing to clear.
  }
  try {
    local()?.removeItem(KEY);
  } catch {
    // Same as above.
  }
}

export function storageAvailable(): boolean {
  try {
    const s = session();
    if (!s) return false;
    s.setItem(`${KEY}:probe`, "1");
    s.removeItem(`${KEY}:probe`);
    return true;
  } catch {
    return false;
  }
}
