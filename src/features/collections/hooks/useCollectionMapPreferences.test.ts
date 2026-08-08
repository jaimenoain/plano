// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useCollectionMapPreferences } from "./useCollectionMapPreferences";

const USER = "user-1";
const COLLECTION = "col-1";

describe("useCollectionMapPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("hydrates every pref from storage on mount, including the Task 5.7 discovery filters", () => {
    localStorage.setItem(`plano:collection-map:showAllBuildings:${USER}:${COLLECTION}`, "true");
    localStorage.setItem(`plano:collection-map:discoveryTierFilter:${USER}:${COLLECTION}`, "Top 5%");
    localStorage.setItem(`plano:collection-map:discoveryCenturies:${USER}:${COLLECTION}`, JSON.stringify([19, 20]));
    localStorage.setItem(
      `plano:collection-map:discoveryFilters:${USER}:${COLLECTION}`,
      JSON.stringify({ category: "cat-1" }),
    );

    const { result } = renderHook(() => useCollectionMapPreferences(USER, COLLECTION));

    expect(result.current.showAllBuildings).toBe(true);
    expect(result.current.discoveryTierFilter).toBe("Top 5%");
    expect(result.current.discoveryCenturies).toEqual([19, 20]);
    expect(result.current.discoveryStandardFilters).toEqual({ category: "cat-1" });
  });

  it("defaults every discovery pref before anything is stored", () => {
    const { result } = renderHook(() => useCollectionMapPreferences(USER, COLLECTION));

    expect(result.current.discoveryTierFilter).toBe("all");
    expect(result.current.discoveryCenturies).toEqual([]);
    expect(result.current.discoveryStandardFilters).toEqual({});
  });

  it("setDiscoveryTierFilter updates state and persists", () => {
    const { result } = renderHook(() => useCollectionMapPreferences(USER, COLLECTION));

    act(() => result.current.setDiscoveryTierFilter("Top 1%"));

    expect(result.current.discoveryTierFilter).toBe("Top 1%");
    expect(localStorage.getItem(`plano:collection-map:discoveryTierFilter:${USER}:${COLLECTION}`)).toBe("Top 1%");
  });

  it("setDiscoveryCenturies updates state and persists", () => {
    const { result } = renderHook(() => useCollectionMapPreferences(USER, COLLECTION));

    act(() => result.current.setDiscoveryCenturies([21]));

    expect(result.current.discoveryCenturies).toEqual([21]);
    expect(localStorage.getItem(`plano:collection-map:discoveryCenturies:${USER}:${COLLECTION}`)).toBe(
      JSON.stringify([21]),
    );
  });

  it("setDiscoveryStandardFilters updates state and persists", () => {
    const { result } = renderHook(() => useCollectionMapPreferences(USER, COLLECTION));

    act(() => result.current.setDiscoveryStandardFilters({ showLost: true }));

    expect(result.current.discoveryStandardFilters).toEqual({ showLost: true });
    expect(
      JSON.parse(localStorage.getItem(`plano:collection-map:discoveryFilters:${USER}:${COLLECTION}`) ?? "null"),
    ).toEqual({ showLost: true });
  });

  it("combines the three discovery prefs into one MapFilters object", () => {
    const { result } = renderHook(() => useCollectionMapPreferences(USER, COLLECTION));

    act(() => {
      result.current.setDiscoveryTierFilter("Top 10%");
      result.current.setDiscoveryCenturies([19]);
      result.current.setDiscoveryStandardFilters({ category: "cat-1" });
    });

    expect(result.current.discoveryFilters).toEqual({
      category: "cat-1",
      centuries: [19],
      minTierRank: "Top 10%",
    });
  });

  it("omits centuries and minTierRank from the combined filters when unset", () => {
    const { result } = renderHook(() => useCollectionMapPreferences(USER, COLLECTION));

    expect(result.current.discoveryFilters).toEqual({
      centuries: undefined,
      minTierRank: undefined,
    });
  });

  // Identical prefs across renders must not produce a new object identity —
  // downstream discovery queries re-key on every pan otherwise.
  it("keeps discoveryFilters referentially stable across an unrelated re-render", () => {
    const { result, rerender } = renderHook(() => useCollectionMapPreferences(USER, COLLECTION));

    const first = result.current.discoveryFilters;
    rerender();
    expect(result.current.discoveryFilters).toBe(first);
  });
});
