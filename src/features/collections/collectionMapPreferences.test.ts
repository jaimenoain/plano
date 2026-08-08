// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  discoveryTierToMinTierRank,
  readDiscoveryCenturiesFromStorage,
  readDiscoveryFiltersFromStorage,
  readDiscoveryTierFilterFromStorage,
  readShowAllBuildingsFromStorage,
  readShowSavedCandidatesFromStorage,
  writeDiscoveryCenturiesToStorage,
  writeDiscoveryFiltersToStorage,
  writeDiscoveryTierFilterToStorage,
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

// Task 5.7 — "Show All Buildings" discovery filters (tier, era, standard filters).
describe("collectionMapPreferences — discovery filters (Task 5.7)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults the tier filter to 'all' and rejects unknown values", () => {
    expect(readDiscoveryTierFilterFromStorage(USER, COLLECTION)).toBe("all");

    localStorage.setItem(`plano:collection-map:discoveryTierFilter:${USER}:${COLLECTION}`, "Top 50%");
    expect(readDiscoveryTierFilterFromStorage(USER, COLLECTION)).toBe("all");
  });

  it("round-trips the tier filter", () => {
    writeDiscoveryTierFilterToStorage(USER, COLLECTION, "Top 5%");
    expect(readDiscoveryTierFilterFromStorage(USER, COLLECTION)).toBe("Top 5%");
  });

  it("maps tier filter values to the RPC's min_tier_rank, and 'all' to undefined", () => {
    expect(discoveryTierToMinTierRank("all")).toBeUndefined();
    expect(discoveryTierToMinTierRank("Top 1%")).toBe("Top 1%");
    expect(discoveryTierToMinTierRank("Top 20%")).toBe("Top 20%");
  });

  it("defaults centuries to an empty array and drops malformed JSON", () => {
    expect(readDiscoveryCenturiesFromStorage(USER, COLLECTION)).toEqual([]);

    localStorage.setItem(`plano:collection-map:discoveryCenturies:${USER}:${COLLECTION}`, "not json");
    expect(readDiscoveryCenturiesFromStorage(USER, COLLECTION)).toEqual([]);

    localStorage.setItem(`plano:collection-map:discoveryCenturies:${USER}:${COLLECTION}`, JSON.stringify([19, 1.5, "x"]));
    expect(readDiscoveryCenturiesFromStorage(USER, COLLECTION)).toEqual([]);
  });

  it("round-trips centuries", () => {
    writeDiscoveryCenturiesToStorage(USER, COLLECTION, [19, 20, 0]);
    expect(readDiscoveryCenturiesFromStorage(USER, COLLECTION)).toEqual([19, 20, 0]);
  });

  it("whitelists standard filter keys — a stray key never survives the round trip", () => {
    writeDiscoveryFiltersToStorage(USER, COLLECTION, {
      category: "cat-1",
      typologies: ["typ-1"],
      // Not on the whitelist: personal-rating / contacts-scoped filters must never
      // reach the discovery RPCs from a stored blob.
      // @ts-expect-error -- intentionally not part of MapFilters' discovery subset
      ratedBy: ["someone"],
    });

    const stored = readDiscoveryFiltersFromStorage(USER, COLLECTION);
    expect(stored).toEqual({ category: "cat-1", typologies: ["typ-1"] });
    expect(stored).not.toHaveProperty("ratedBy");
  });

  it("drops every key from a corrupt/foreign blob", () => {
    localStorage.setItem(
      `plano:collection-map:discoveryFilters:${USER}:${COLLECTION}`,
      JSON.stringify({ minRating: 3, evilKey: "rpc-injection-attempt" }),
    );
    expect(readDiscoveryFiltersFromStorage(USER, COLLECTION)).toEqual({});
  });

  it("defaults to an empty object when nothing is stored or JSON is malformed", () => {
    expect(readDiscoveryFiltersFromStorage(USER, COLLECTION)).toEqual({});
    localStorage.setItem(`plano:collection-map:discoveryFilters:${USER}:${COLLECTION}`, "{not json");
    expect(readDiscoveryFiltersFromStorage(USER, COLLECTION)).toEqual({});
  });
});
