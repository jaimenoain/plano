import type { MapFilters } from '@/types/plano-map';

/** Canonical building status for structures no longer standing. */
export const LOST_BUILDING_STATUS = 'Lost' as const;

/** Legacy DB enum value; treated as {@link LOST_BUILDING_STATUS} in the app. */
export const LEGACY_DEMOLISHED_STATUS = 'Demolished' as const;

export function isLostStatus(status: string | null | undefined): boolean {
  return status === LOST_BUILDING_STATUS || status === LEGACY_DEMOLISHED_STATUS;
}

/** Map legacy `Demolished` to `Lost` for filters, display, and URL state. */
export function normalizeConstructionStatus(status: string): string {
  return status === LEGACY_DEMOLISHED_STATUS ? LOST_BUILDING_STATUS : status;
}

export function normalizeConstructionStatuses(statuses: string[]): string[] {
  return [...new Set(statuses.map(normalizeConstructionStatus))];
}

export function formatBuildingStatusForDisplay(status: string): string {
  return normalizeConstructionStatus(status);
}

/**
 * Construction statuses hidden by default in browse/search.
 * Includes legacy `Demolished` so rows not yet migrated stay hidden.
 */
export const DEFAULT_EXCLUDED_CONSTRUCTION_STATUSES = [
  LEGACY_DEMOLISHED_STATUS,
  LOST_BUILDING_STATUS,
  'Under Construction',
  'Unbuilt',
] as const;

/** Excluded when the "show lost buildings" toggle is on (Lost/Demolished are shown). */
export const SHOW_LOST_EXCLUDED_CONSTRUCTION_STATUSES = [
  'Under Construction',
  'Unbuilt',
] as const;

const SHOW_LOST_URL_KEYS = ['showLost', 'showDemolished'] as const;

/** Read show-lost toggle from URL (supports legacy `showDemolished`). */
export function getShowLostFromUrlParams(
  getParam: (key: string) => string | null,
): boolean {
  return SHOW_LOST_URL_KEYS.some((key) => getParam(key) === 'true');
}

export interface ConstructionStatusFilter {
  construction_statuses?: string[];
  exclude_construction_statuses?: string[];
}

/**
 * Resolve the construction-status payload shared by the map cluster RPC
 * (`get_map_clusters_v3`) and the SERP list RPC (`get_buildings_list`) so both
 * surfaces apply identical semantics:
 *
 * - explicit picks from the Building-status filter → strict inclusion
 *   (NULL-status rows are intentionally excluded).
 * - "Show lost" toggle → exclusion list that reveals Lost/Demolished while
 *   still hiding Under Construction / Unbuilt.
 * - default → exclusion list hiding non-standing + not-yet-built buildings,
 *   so legacy rows with `status IS NULL` stay visible.
 */
export function resolveConstructionStatuses(
  filters: Pick<MapFilters, 'constructionStatuses' | 'showLost'>,
): ConstructionStatusFilter {
  if (filters.constructionStatuses && filters.constructionStatuses.length > 0) {
    return { construction_statuses: filters.constructionStatuses };
  }
  if (filters.showLost) {
    return { exclude_construction_statuses: [...SHOW_LOST_EXCLUDED_CONSTRUCTION_STATUSES] };
  }
  return { exclude_construction_statuses: [...DEFAULT_EXCLUDED_CONSTRUCTION_STATUSES] };
}
