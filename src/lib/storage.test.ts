import { defaultState } from "../app/model.ts";
import { reducer } from "../app/reducer.ts";
import { deriveKey, newSalt, open, seal } from "./crypto.ts";
import { decodeShare, encodeShare } from "./share.ts";
import { KEY, clearAll, load, save, unlock } from "./storage.ts";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

beforeEach(() => {
  vi.stubGlobal("sessionStorage", new MemoryStorage());
  vi.stubGlobal("localStorage", new MemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const withSalary = reducer(defaultState(), {
  type: "setProfile",
  profile: { salary: 140_000 },
});

describe("storage", () => {
  it("keeps state in session storage by default", async () => {
    await save(withSalary, null);
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(load()).toEqual({ status: "ready", state: withSalary });
  });

  it("moves state to local storage only when the renter opts in", async () => {
    await save(withSalary, null);
    const remembered = reducer(withSalary, {
      type: "setSettings",
      settings: { remember: true },
    });
    await save(remembered, null);
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it("seals remembered state so the salary is not readable", async () => {
    const remembered = reducer(withSalary, {
      type: "setSettings",
      settings: { remember: true },
    });
    const salt = newSalt();
    const key = await deriveKey("correct horse", salt, 1000);
    await save(remembered, { key, salt });
    expect(localStorage.getItem(KEY)).not.toContain("140000");
    const loaded = load();
    expect(loaded.status).toBe("locked");
    if (loaded.status !== "locked") throw new Error("expected locked");
    await expect(unlock(key, loaded.sealed)).resolves.toEqual(remembered);
  });

  it("clears both stores", async () => {
    await save(withSalary, null);
    clearAll();
    expect(load()).toEqual({ status: "empty" });
  });

  it("treats corrupt data as empty", () => {
    sessionStorage.setItem(KEY, "{not json");
    expect(load()).toEqual({ status: "empty" });
  });
});

describe("crypto", () => {
  it("refuses the wrong passphrase", async () => {
    const salt = newSalt();
    const right = await deriveKey("right", salt, 1000);
    const wrong = await deriveKey("wrong", salt, 1000);
    const sealed = await seal(right, salt, "secret");
    await expect(open(right, sealed)).resolves.toBe("secret");
    await expect(open(wrong, sealed)).rejects.toMatchObject({
      name: "OperationError",
    });
  });
});

describe("share links", () => {
  it("leaves salary and listings out by default", () => {
    const hash = `#${encodeShare(withSalary)}`;
    const opened = decodeShare(hash, defaultState())!;
    expect(opened.profile.salary).toBeNull();
    expect(opened.onboarded).toBe(true);
  });

  it("includes the budget when the renter opts in", () => {
    const sharing = reducer(withSalary, {
      type: "setSettings",
      settings: { shareBudget: true },
    });
    const opened = decodeShare(`#${encodeShare(sharing)}`, defaultState())!;
    expect(opened.profile.salary).toBe(140_000);
  });

  it("keeps the recipient's own settings", () => {
    const mine = reducer(defaultState(), {
      type: "setSettings",
      settings: { language: "es" },
    });
    const opened = decodeShare(`#${encodeShare(withSalary)}`, mine)!;
    expect(opened.settings.language).toBe("es");
  });

  it("ignores fragments that are not share links", () => {
    expect(decodeShare("#main", defaultState())).toBeNull();
    expect(decodeShare("#s=%%%", defaultState())).toBeNull();
  });
});
