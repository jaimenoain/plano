/**
 * collectionMapPreferences.ts
 *
 * Per-user, per-collection map preferences for the collection detail page —
 * whether the saved-places suggestion overlay is on, and how it is filtered.
 * These live in `localStorage` (not the DB): they are a viewing preference of
 * the *reader*, not state of the collection, and every read is defensive
 * because private mode / quota errors must never take the page down.
 *
 * Extracted verbatim from `CollectionMapPage.tsx` — pure functions, no JSX.
 */
import type { SavedPlacesDotFilter, SavedPlacesStatusFilter } from "./types";

const SHOW_SAVED_CANDIDATES_STORAGE = "plano:collection-map:showSavedPlaces" as const;
const SAVED_PLACES_DOT_FILTER_STORAGE = "plano:collection-map:savedPlacesDotFilter" as const;
const SAVED_PLACES_STATUS_FILTER_STORAGE = "plano:collection-map:savedPlacesStatusFilter" as const;

const SAVED_PLACES_DOT_FILTERS: SavedPlacesDotFilter[] = ['all', '1', '2', '3'];
const SAVED_PLACES_STATUS_FILTERS: SavedPlacesStatusFilter[] = ['all', 'visited', 'pending'];

export function readShowSavedCandidatesFromStorage(userId: string, collectionId: string): boolean {
  try {
    return localStorage.getItem(`${SHOW_SAVED_CANDIDATES_STORAGE}:${userId}:${collectionId}`) === "true";
  } catch {
    return false;
  }
}

export function writeShowSavedCandidatesToStorage(userId: string, collectionId: string, value: boolean): void {
  try {
    localStorage.setItem(`${SHOW_SAVED_CANDIDATES_STORAGE}:${userId}:${collectionId}`, String(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readSavedPlacesDotFilterFromStorage(userId: string, collectionId: string): SavedPlacesDotFilter {
  try {
    const raw = localStorage.getItem(`${SAVED_PLACES_DOT_FILTER_STORAGE}:${userId}:${collectionId}`);
    if (raw && (SAVED_PLACES_DOT_FILTERS as readonly string[]).includes(raw)) {
      return raw as SavedPlacesDotFilter;
    }
  } catch {
    /* ignore */
  }
  return 'all';
}

export function writeSavedPlacesDotFilterToStorage(
  userId: string,
  collectionId: string,
  value: SavedPlacesDotFilter,
): void {
  try {
    localStorage.setItem(`${SAVED_PLACES_DOT_FILTER_STORAGE}:${userId}:${collectionId}`, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readSavedPlacesStatusFilterFromStorage(userId: string, collectionId: string): SavedPlacesStatusFilter {
  try {
    const raw = localStorage.getItem(`${SAVED_PLACES_STATUS_FILTER_STORAGE}:${userId}:${collectionId}`);
    if (raw && (SAVED_PLACES_STATUS_FILTERS as readonly string[]).includes(raw)) {
      return raw as SavedPlacesStatusFilter;
    }
  } catch {
    /* ignore */
  }
  return 'all';
}

export function writeSavedPlacesStatusFilterToStorage(
  userId: string,
  collectionId: string,
  value: SavedPlacesStatusFilter,
): void {
  try {
    localStorage.setItem(`${SAVED_PLACES_STATUS_FILTER_STORAGE}:${userId}:${collectionId}`, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function matchesSavedPlacesDotFilter(
  rating: number | null | undefined,
  filter: SavedPlacesDotFilter,
): boolean {
  if (filter === 'all') return true;
  const n = filter === '1' ? 1 : filter === '2' ? 2 : 3;
  return rating === n;
}

export function matchesSavedPlacesStatusFilter(
  status: string | null | undefined,
  filter: SavedPlacesStatusFilter,
): boolean {
  if (filter === 'all') return true;
  if (status == null) return false;
  return status === filter;
}
