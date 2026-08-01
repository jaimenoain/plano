// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  readShowAllBuildingsFromStorage,
  readShowSavedCandidatesFromStorage,
  writeShowAllBuildingsToStorage,
  writeShowSavedCandidatesToStorage,
} from "./collectionMapPreferences";

const USER = "user-1";
const COLLECTION = "col-1";

describe("collectionMapPreferences — boolean prefs", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("defaults every switch to off before anything is stored", () => {
    expect(readShowSavedCandidatesFromStorage(USER, COLLECTION)).toBe(false);
    expect(readShowAllBuildingsFromStorage(USER, COLLECTION)).toBe(false);
  });

  it("round-trips each switch", () => {
    writeShowAllBuildingsToStorage(USER, COLLECTION, true);
    writeShowSavedCandidatesToStorage(USER, COLLECTION, true);

    expect(readShowAllBuildingsFromStorage(USER, COLLECTION)).toBe(true);
    expect(readShowSavedCandidatesFromStorage(USER, COLLECTION)).toBe(true);

    writeShowAllBuildingsToStorage(USER, COLLECTION, false);
    expect(readShowAllBuildingsFromStorage(USER, COLLECTION)).toBe(false);
  });

  // Each pref is its own key: discovery must not inherit the saved-places state.
  it("keeps the prefs independent, and scoped per user and per collection", () => {
    writeShowAllBuildingsToStorage(USER, COLLECTION, true);

    expect(readShowSavedCandidatesFromStorage(USER, COLLECTION)).toBe(false);
    expect(readShowAllBuildingsFromStorage(USER, "other-collection")).toBe(false);
    expect(readShowAllBuildingsFromStorage("other-user", COLLECTION)).toBe(false);
  });

  // Private mode / quota: storage throws. The map must still render.
  it("survives a throwing localStorage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });

    expect(() => writeShowAllBuildingsToStorage(USER, COLLECTION, true)).not.toThrow();
    expect(readShowAllBuildingsFromStorage(USER, COLLECTION)).toBe(false);
  });
});
