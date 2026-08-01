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
import { useCallback, useLayoutEffect, useState } from "react";
import {
  readSavedPlacesDotFilterFromStorage,
  readSavedPlacesStatusFilterFromStorage,
  readShowAllBuildingsFromStorage,
  readShowSavedCandidatesFromStorage,
  writeSavedPlacesDotFilterToStorage,
  writeSavedPlacesStatusFilterToStorage,
  writeShowAllBuildingsToStorage,
  writeShowSavedCandidatesToStorage,
} from "../collectionMapPreferences";
import type { SavedPlacesDotFilter, SavedPlacesStatusFilter } from "../types";

export interface CollectionMapPreferences {
  showSavedCandidates: boolean;
  setShowSavedCandidates: (value: boolean) => void;
  savedPlacesDotFilter: SavedPlacesDotFilter;
  setSavedPlacesDotFilter: (value: SavedPlacesDotFilter) => void;
  savedPlacesStatusFilter: SavedPlacesStatusFilter;
  setSavedPlacesStatusFilter: (value: SavedPlacesStatusFilter) => void;
  showAllBuildings: boolean;
  setShowAllBuildings: (value: boolean) => void;
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

  useLayoutEffect(() => {
    if (!userId || !collectionId) return;
    setShowSavedCandidatesState(readShowSavedCandidatesFromStorage(userId, collectionId));
    setSavedPlacesDotFilterState(readSavedPlacesDotFilterFromStorage(userId, collectionId));
    setSavedPlacesStatusFilterState(readSavedPlacesStatusFilterFromStorage(userId, collectionId));
    setShowAllBuildingsState(readShowAllBuildingsFromStorage(userId, collectionId));
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

  return {
    showSavedCandidates,
    setShowSavedCandidates,
    savedPlacesDotFilter,
    setSavedPlacesDotFilter,
    savedPlacesStatusFilter,
    setSavedPlacesStatusFilter,
    showAllBuildings,
    setShowAllBuildings,
  };
}
