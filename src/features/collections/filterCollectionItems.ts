/**
 * filterCollectionItems.ts
 *
 * "Search within this collection" — a pure, client-side filter over data the
 * collection detail page already holds in memory (it loads every item at once,
 * so there is nothing to fetch).
 *
 * One matcher serves both panes. The page filters the *list* with these
 * helpers and then filters the map pins by the ids they returned, so the rail
 * and the map can never disagree about what matches.
 *
 * Matching is token-AND over a per-record haystack: every whitespace-separated
 * token must appear somewhere, which makes `zaha london` narrow rather than
 * widen. Diacritics are folded — see `@/utils/searchText`.
 */
import { primaryBuildingCreditsToSummaries } from "@/features/credits/api/credits";
import type { DiscoveryBuilding } from "@/features/search/components/types";
import { buildHaystack, matchesAllTokens, tokenize } from "@/utils/searchText";
import type { CollectionItemWithBuilding, CollectionMarker } from "./types";

/** True when the query has at least one usable token (whitespace-only doesn't count). */
export function isSearchActive(query: string | null | undefined): boolean {
  return tokenize(query).length > 0;
}

/**
 * Building name, architect/firm credits, place, year and the member's note —
 * the fields a reader would plausibly remember an entry by.
 */
export function collectionItemHaystack(item: CollectionItemWithBuilding): string {
  const creditNames = primaryBuildingCreditsToSummaries(item.building.building_credits ?? []).map(
    (credit) => credit.name,
  );
  return buildHaystack([
    item.building.name,
    ...creditNames,
    item.building.city,
    item.building.country,
    item.building.address,
    item.building.year_completed,
    item.note,
  ]);
}

/** Non-building markers (hotels, restaurants, transport) match on their own fields. */
export function collectionMarkerHaystack(marker: CollectionMarker): string {
  return buildHaystack([
    marker.name,
    marker.address,
    marker.notes,
    marker.category,
    marker.google_primary_type,
  ]);
}

/**
 * Saved-place suggestion pins, which arrive already projected into
 * `DiscoveryBuilding` and so carry no note.
 */
export function discoveryBuildingHaystack(building: DiscoveryBuilding): string {
  return buildHaystack([
    building.name,
    ...(building.credits ?? []).map((credit) => credit.name),
    building.city,
    building.country,
    building.year_completed,
  ]);
}

export function filterCollectionItems(
  items: CollectionItemWithBuilding[],
  query: string | null | undefined,
): CollectionItemWithBuilding[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return items;
  return items.filter((item) => matchesAllTokens(collectionItemHaystack(item), tokens));
}

export function filterCollectionMarkers(
  markers: CollectionMarker[],
  query: string | null | undefined,
): CollectionMarker[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return markers;
  return markers.filter((marker) => matchesAllTokens(collectionMarkerHaystack(marker), tokens));
}

export function filterDiscoveryBuildings(
  buildings: DiscoveryBuilding[],
  query: string | null | undefined,
): DiscoveryBuilding[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return buildings;
  return buildings.filter((building) =>
    matchesAllTokens(discoveryBuildingHaystack(building), tokens),
  );
}
