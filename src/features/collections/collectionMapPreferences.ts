/**
 * collectionMapPreferences.ts
 *
 * Per-user, per-collection map preferences for the collection detail page —
 * whether the saved-places suggestion overlay is on, how it is filtered, and
 * whether the discovery layer (every building in view, so editors can add from
 * the map) is on. They enable *sources*; the rail's Collection / Discover / All
 * view picks between them and is session state, not a preference (ADR 0026).
 *
 * These live in `localStorage` (not the DB): they are a viewing
 * preference of the *reader*, not state of the collection, and every read is
 * defensive because private mode / quota errors must never take the page down.
 *
 * Extracted verbatim from `CollectionMapPage.tsx` — pure functions, no JSX.
 */
import type { SavedPlacesDotFilter, SavedPlacesStatusFilter } from "./types";

const SHOW_SAVED_CANDIDATES_STORAGE = "plano:collection-map:showSavedPlaces" as const;
const SAVED_PLACES_DOT_FILTER_STORAGE = "plano:collection-map:savedPlacesDotFilter" as const;
const SAVED_PLACES_STATUS_FILTER_STORAGE = "plano:collection-map:savedPlacesStatusFilter" as const;
const SHOW_ALL_BUILDINGS_STORAGE = "plano:collection-map:showAllBuildings" as const;

const SAVED_PLACES_DOT_FILTERS: SavedPlacesDotFilter[] = ['all', '1', '2', '3'];
const SAVED_PLACES_STATUS_FILTERS: SavedPlacesStatusFilter[] = ['all', 'visited', 'pending'];

/** Every boolean pref defaults to `false` — absent, malformed or unreadable all read as off. */
function readBoolPref(key: string, userId: string, collectionId: string): boolean {
  try {
    return localStorage.getItem(`${key}:${userId}:${collectionId}`) === "true";
  } catch {
    return false;
  }
}

function writeBoolPref(key: string, userId: string, collectionId: string, value: boolean): void {
  try {
    localStorage.setItem(`${key}:${userId}:${collectionId}`, String(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readShowSavedCandidatesFromStorage(userId: string, collectionId: string): boolean {
  return readBoolPref(SHOW_SAVED_CANDIDATES_STORAGE, userId, collectionId);
}

export function writeShowSavedCandidatesToStorage(userId: string, collectionId: string, value: boolean): void {
  writeBoolPref(SHOW_SAVED_CANDIDATES_STORAGE, userId, collectionId, value);
}

export function readShowAllBuildingsFromStorage(userId: string, collectionId: string): boolean {
  return readBoolPref(SHOW_ALL_BUILDINGS_STORAGE, userId, collectionId);
}

export function writeShowAllBuildingsToStorage(userId: string, collectionId: string, value: boolean): void {
  writeBoolPref(SHOW_ALL_BUILDINGS_STORAGE, userId, collectionId, value);
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
