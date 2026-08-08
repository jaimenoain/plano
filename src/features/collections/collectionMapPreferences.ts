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
import type { MapFilters } from "@/types/plano-map";
import type { DiscoveryTierFilter, SavedPlacesDotFilter, SavedPlacesStatusFilter } from "./types";

const SHOW_SAVED_CANDIDATES_STORAGE = "plano:collection-map:showSavedPlaces" as const;
const SAVED_PLACES_DOT_FILTER_STORAGE = "plano:collection-map:savedPlacesDotFilter" as const;
const SAVED_PLACES_STATUS_FILTER_STORAGE = "plano:collection-map:savedPlacesStatusFilter" as const;
const SHOW_ALL_BUILDINGS_STORAGE = "plano:collection-map:showAllBuildings" as const;
const DISCOVERY_TIER_FILTER_STORAGE = "plano:collection-map:discoveryTierFilter" as const;
const DISCOVERY_CENTURIES_STORAGE = "plano:collection-map:discoveryCenturies" as const;
const DISCOVERY_FILTERS_STORAGE = "plano:collection-map:discoveryFilters" as const;

const SAVED_PLACES_DOT_FILTERS: SavedPlacesDotFilter[] = ['all', '1', '2', '3'];
const SAVED_PLACES_STATUS_FILTERS: SavedPlacesStatusFilter[] = ['all', 'visited', 'pending'];
const DISCOVERY_TIER_FILTERS: DiscoveryTierFilter[] = ['all', 'Top 1%', 'Top 5%', 'Top 10%', 'Top 20%'];

/**
 * Whitelisted keys the "More filters" panel (Task 5.7) may persist, mirroring
 * the standard building filters `DiscoveryFiltersPanel` exposes. Deliberately
 * excludes anything personal-rating / contacts / collections-scoped — those
 * don't apply to "every building in view" and reading a stray key back out of
 * a corrupt or stale blob must never let localStorage inject arbitrary RPC
 * arguments.
 */
const DISCOVERY_FILTER_KEYS = [
  'category',
  'typologies',
  'materials',
  'styles',
  'contexts',
  'attributes',
  'people',
  'creditCompany',
  'creditRoles',
  'constructionStatuses',
  'showLost',
  'awardId',
  'awardOutcome',
  'awardYearFrom',
  'awardYearTo',
  'sizeCategories',
  'minSizeSqm',
  'maxSizeSqm',
  'minStoreys',
  'maxStoreys',
] as const satisfies readonly (keyof MapFilters)[];

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

export function readDiscoveryTierFilterFromStorage(userId: string, collectionId: string): DiscoveryTierFilter {
  try {
    const raw = localStorage.getItem(`${DISCOVERY_TIER_FILTER_STORAGE}:${userId}:${collectionId}`);
    if (raw && (DISCOVERY_TIER_FILTERS as readonly string[]).includes(raw)) {
      return raw as DiscoveryTierFilter;
    }
  } catch {
    /* ignore */
  }
  return 'all';
}

export function writeDiscoveryTierFilterToStorage(
  userId: string,
  collectionId: string,
  value: DiscoveryTierFilter,
): void {
  try {
    localStorage.setItem(`${DISCOVERY_TIER_FILTER_STORAGE}:${userId}:${collectionId}`, value);
  } catch {
    /* ignore quota / private mode */
  }
}

/** `filter_criteria.min_tier_rank` for the discovery RPCs — `undefined` when unset. */
export function discoveryTierToMinTierRank(
  filter: DiscoveryTierFilter,
): 'Top 1%' | 'Top 5%' | 'Top 10%' | 'Top 20%' | undefined {
  return filter === 'all' ? undefined : filter;
}

export function readDiscoveryCenturiesFromStorage(userId: string, collectionId: string): number[] {
  try {
    const raw = localStorage.getItem(`${DISCOVERY_CENTURIES_STORAGE}:${userId}:${collectionId}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((n) => Number.isInteger(n))) {
      return parsed as number[];
    }
  } catch {
    /* ignore malformed JSON / quota / private mode */
  }
  return [];
}

export function writeDiscoveryCenturiesToStorage(
  userId: string,
  collectionId: string,
  value: number[],
): void {
  try {
    localStorage.setItem(`${DISCOVERY_CENTURIES_STORAGE}:${userId}:${collectionId}`, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

type DiscoveryFilterKey = (typeof DISCOVERY_FILTER_KEYS)[number];

/** Copies one whitelisted key, keeping its value tied to that key's own type. */
function copyDiscoveryFilterKey<K extends DiscoveryFilterKey>(
  source: Partial<Record<DiscoveryFilterKey, unknown>>,
  key: K,
  result: Partial<MapFilters>,
): void {
  if (key in source) {
    result[key] = source[key] as MapFilters[K];
  }
}

/** Drop every key not on the whitelist — the one thing that keeps a corrupt/stale blob safe to trust. */
function sanitizeDiscoveryFilters(value: unknown): Partial<MapFilters> {
  if (typeof value !== 'object' || value === null) return {};
  const source = value as Partial<Record<DiscoveryFilterKey, unknown>>;
  const result: Partial<MapFilters> = {};
  for (const key of DISCOVERY_FILTER_KEYS) {
    copyDiscoveryFilterKey(source, key, result);
  }
  return result;
}

export function readDiscoveryFiltersFromStorage(userId: string, collectionId: string): Partial<MapFilters> {
  try {
    const raw = localStorage.getItem(`${DISCOVERY_FILTERS_STORAGE}:${userId}:${collectionId}`);
    if (!raw) return {};
    return sanitizeDiscoveryFilters(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function writeDiscoveryFiltersToStorage(
  userId: string,
  collectionId: string,
  value: Partial<MapFilters>,
): void {
  try {
    localStorage.setItem(
      `${DISCOVERY_FILTERS_STORAGE}:${userId}:${collectionId}`,
      JSON.stringify(sanitizeDiscoveryFilters(value)),
    );
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
