// App state with persistence. The reducer state is saved, debounced, to the
// store the renter chose; a passphrase lock, when set, lives only in memory.
import {
  type ActionDispatch,
  type ReactNode,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { type Sealed, deriveKey, newSalt, saltOf } from "../lib/crypto.ts";
import { decodeShare } from "../lib/share.ts";
import {
  type Lock,
  clearAll,
  load,
  save,
  storageAvailable,
  unlock,
} from "../lib/storage.ts";
import { type AppState, defaultState } from "./model.ts";
import { type Action, reducer } from "./reducer.ts";

const SAVE_DELAY_MS = 500;

interface StateValue {
  state: AppState;
  dispatch: ActionDispatch<[Action]>;
  locked: Sealed | null;
  hasPassphrase: boolean;
  storageOk: boolean;
  unlockWith: (passphrase: string) => Promise<boolean>;
  setPassphrase: (passphrase: string | null) => Promise<void>;
  deleteEverything: () => void;
}

const StateContext = createContext<StateValue | null>(null);

function boot(): { state: AppState; locked: Sealed | null } {
  const loaded = load();
  let state = loaded.status === "ready" ? loaded.state : defaultState();
  const locked = loaded.status === "locked" ? loaded.sealed : null;
  const shared = decodeShare(location.hash, state);
  if (shared) {
    state = shared;
    history.replaceState(null, "", location.pathname + location.search);
  }
  return { state, locked: shared ? null : locked };
}

export function StateProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(boot);
  const [state, dispatch] = useReducer(reducer, initial.state);
  const [locked, setLocked] = useState<Sealed | null>(initial.locked);
  const [lock, setLock] = useState<Lock | null>(null);
  const [storageOk, setStorageOk] = useState(storageAvailable);
  const latest = useRef({ state, lock, locked });
  useEffect(() => {
    latest.current = { state, lock, locked };
  }, [state, lock, locked]);

  useEffect(() => {
    // Never overwrite sealed data while it is still locked.
    if (locked) return;
    const timer = setTimeout(() => {
      void save(state, lock).then(setStorageOk);
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, lock, locked]);

  useEffect(() => {
    const flush = () => {
      const current = latest.current;
      if (!current.locked) void save(current.state, current.lock);
    };
    addEventListener("pagehide", flush);
    return () => removeEventListener("pagehide", flush);
  }, []);

  const unlockWith = useCallback(
    async (passphrase: string) => {
      if (!locked) return true;
      const salt = saltOf(locked);
      const key = await deriveKey(passphrase, salt);
      try {
        const restored = await unlock(key, locked);
        dispatch({ type: "replace", state: restored });
        setLock({ key, salt });
        setLocked(null);
        return true;
      } catch {
        return false;
      }
    },
    [locked],
  );

  const setPassphrase = useCallback(async (passphrase: string | null) => {
    if (!passphrase) {
      setLock(null);
      return;
    }
    const salt = newSalt();
    setLock({ key: await deriveKey(passphrase, salt), salt });
  }, []);

  const deleteEverything = useCallback(() => {
    clearAll();
    setLock(null);
    setLocked(null);
    dispatch({ type: "reset" });
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      locked,
      hasPassphrase: lock !== null,
      storageOk,
      unlockWith,
      setPassphrase,
      deleteEverything,
    }),
    [
      state,
      locked,
      lock,
      storageOk,
      unlockWith,
      setPassphrase,
      deleteEverything,
    ],
  );
  return <StateContext value={value}>{children}</StateContext>;
}

export function useAppState(): StateValue {
  const value = use(StateContext);
  if (!value) throw new Error("useAppState outside StateProvider");
  return value;
}
