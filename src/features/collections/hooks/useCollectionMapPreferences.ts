/**
 * useCollectionMapPreferences.ts
 *
 * The collection map's per-viewer display state: which *sources* the page may
 * draw beyond the collection itself — the saved-places suggestion overlay (+ its
 * two filters) and the catalogue discovery layer. None of these belong to the
 * collection — they are how *this* person is working on it right now — so they
 * persist to `localStorage` per (user, collection) rather than to the DB.
 *
 * Which of the enabled sources is on screen is *not* here: that is the rail's
 * Collection / Discover / All view, session state on the page (ADR 0026).
 *
 * Hydration runs in a layout effect so the first painted frame already reflects
 * the stored values; writes go through the setters, never through an effect on
 * the state (which would clobber a fresh collection's defaults on switch).
 */
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import type { MapFilters } from "@/types/plano-map";
import {
  discoveryTierToMinTierRank,
  readDiscoveryCenturiesFromStorage,
  readDiscoveryFiltersFromStorage,
  readDiscoveryTierFilterFromStorage,
  readSavedPlacesDotFilterFromStorage,
  readSavedPlacesStatusFilterFromStorage,
  readShowAllBuildingsFromStorage,
  readShowSavedCandidatesFromStorage,
  writeDiscoveryCenturiesToStorage,
  writeDiscoveryFiltersToStorage,
  writeDiscoveryTierFilterToStorage,
  writeSavedPlacesDotFilterToStorage,
  writeSavedPlacesStatusFilterToStorage,
  writeShowAllBuildingsToStorage,
  writeShowSavedCandidatesToStorage,
} from "../collectionMapPreferences";
import type { DiscoveryTierFilter, SavedPlacesDotFilter, SavedPlacesStatusFilter } from "../types";

export interface CollectionMapPreferences {
  showSavedCandidates: boolean;
  setShowSavedCandidates: (value: boolean) => void;
  savedPlacesDotFilter: SavedPlacesDotFilter;
  setSavedPlacesDotFilter: (value: SavedPlacesDotFilter) => void;
  savedPlacesStatusFilter: SavedPlacesStatusFilter;
  setSavedPlacesStatusFilter: (value: SavedPlacesStatusFilter) => void;
  showAllBuildings: boolean;
  setShowAllBuildings: (value: boolean) => void;
  /** Task 5.7 — "Show All Buildings" discovery filters. */
  discoveryTierFilter: DiscoveryTierFilter;
  setDiscoveryTierFilter: (value: DiscoveryTierFilter) => void;
  discoveryCenturies: number[];
  setDiscoveryCenturies: (value: number[]) => void;
  discoveryStandardFilters: Partial<MapFilters>;
  setDiscoveryStandardFilters: (value: Partial<MapFilters>) => void;
  /**
   * The three discovery prefs above, combined into one `MapFilters` object
   * ready to pass to `useCollectionDiscoveryClusters` / `useCollectionDiscoverInView`.
   * Referentially stable across renders when the underlying prefs don't change,
   * so pins don't re-key their query on every pan.
   */
  discoveryFilters: MapFilters;
}

export function useCollectionMapPreferences(
  userId: string | undefined,
  collectionId: string | undefined,
): CollectionMapPreferences {
  const [showSavedCandidates, setShowSavedCandidatesState] = useState(false);
  const [savedPlacesDotFilter, setSavedPlacesDotFilterState] = useState<SavedPlacesDotFilter>("all");
  const [savedPlacesStatusFilter, setSavedPlacesStatusFilterState] =
    useState<SavedPlacesStatusFilter>("all");
  const [showAllBuildings, setShowAllBuildingsState] = useState(false);
  const [discoveryTierFilter, setDiscoveryTierFilterState] = useState<DiscoveryTierFilter>("all");
  const [discoveryCenturies, setDiscoveryCenturiesState] = useState<number[]>([]);
  const [discoveryStandardFilters, setDiscoveryStandardFiltersState] = useState<Partial<MapFilters>>({});

  useLayoutEffect(() => {
    if (!userId || !collectionId) return;
    setShowSavedCandidatesState(readShowSavedCandidatesFromStorage(userId, collectionId));
    setSavedPlacesDotFilterState(readSavedPlacesDotFilterFromStorage(userId, collectionId));
    setSavedPlacesStatusFilterState(readSavedPlacesStatusFilterFromStorage(userId, collectionId));
    setShowAllBuildingsState(readShowAllBuildingsFromStorage(userId, collectionId));
    setDiscoveryTierFilterState(readDiscoveryTierFilterFromStorage(userId, collectionId));
    setDiscoveryCenturiesState(readDiscoveryCenturiesFromStorage(userId, collectionId));
    setDiscoveryStandardFiltersState(readDiscoveryFiltersFromStorage(userId, collectionId));
  }, [userId, collectionId]);

  const setShowSavedCandidates = useCallback(
    (value: boolean) => {
      setShowSavedCandidatesState(value);
      if (userId && collectionId) writeShowSavedCandidatesToStorage(userId, collectionId, value);
    },
    [userId, collectionId],
  );

  const setSavedPlacesDotFilter = useCallback(
    (value: SavedPlacesDotFilter) => {
      setSavedPlacesDotFilterState(value);
      if (userId && collectionId) writeSavedPlacesDotFilterToStorage(userId, collectionId, value);
    },
    [userId, collectionId],
  );

  const setSavedPlacesStatusFilter = useCallback(
    (value: SavedPlacesStatusFilter) => {
      setSavedPlacesStatusFilterState(value);
      if (userId && collectionId) writeSavedPlacesStatusFilterToStorage(userId, collectionId, value);
    },
    [userId, collectionId],
  );

  const setShowAllBuildings = useCallback(
    (value: boolean) => {
      setShowAllBuildingsState(value);
      if (userId && collectionId) writeShowAllBuildingsToStorage(userId, collectionId, value);
    },
    [userId, collectionId],
  );

  const setDiscoveryTierFilter = useCallback(
    (value: DiscoveryTierFilter) => {
      setDiscoveryTierFilterState(value);
      if (userId && collectionId) writeDiscoveryTierFilterToStorage(userId, collectionId, value);
    },
    [userId, collectionId],
  );

  const setDiscoveryCenturies = useCallback(
    (value: number[]) => {
      setDiscoveryCenturiesState(value);
      if (userId && collectionId) writeDiscoveryCenturiesToStorage(userId, collectionId, value);
    },
    [userId, collectionId],
  );

  const setDiscoveryStandardFilters = useCallback(
    (value: Partial<MapFilters>) => {
      setDiscoveryStandardFiltersState(value);
      if (userId && collectionId) writeDiscoveryFiltersToStorage(userId, collectionId, value);
    },
    [userId, collectionId],
  );

  const discoveryFilters = useMemo<MapFilters>(
    () => ({
      ...discoveryStandardFilters,
      centuries: discoveryCenturies.length > 0 ? discoveryCenturies : undefined,
      minTierRank: discoveryTierToMinTierRank(discoveryTierFilter),
    }),
    [discoveryStandardFilters, discoveryCenturies, discoveryTierFilter],
  );

  return {
    showSavedCandidates,
    setShowSavedCandidates,
    savedPlacesDotFilter,
    setSavedPlacesDotFilter,
    savedPlacesStatusFilter,
    setSavedPlacesStatusFilter,
    showAllBuildings,
    setShowAllBuildings,
    discoveryTierFilter,
    setDiscoveryTierFilter,
    discoveryCenturies,
    setDiscoveryCenturies,
    discoveryStandardFilters,
    setDiscoveryStandardFilters,
    discoveryFilters,
  };
}
