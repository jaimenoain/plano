/**
 * useCollectionSearch.ts
 *
 * "Search within this collection" for the collection detail page.
 *
 * The page already holds every item in memory, so this is a pure client-side
 * narrowing — no fetching. It owns the query, mirrors it into `?q=`, and
 * returns one `matchedIds` set that BOTH panes filter by, which is what keeps
 * the rail list and the map pins from ever disagreeing.
 *
 * Only the All Items tab is searchable: filtering pins underneath a rendered
 * itinerary would break the day sequence, so on the Itinerary tab the query is
 * kept but not applied.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useDebounce } from "@/hooks/useDebounce";
import type { DiscoveryBuilding } from "@/features/search/components/types";
import { getBoundsFromBuildings, type Bounds } from "@/utils/map";
import {
  filterCollectionItems,
  filterCollectionMarkers,
  isSearchActive,
} from "../filterCollectionItems";
import type { CollectionItemWithBuilding, CollectionMarker } from "../types";

interface UseCollectionSearchArgs {
  /** Collection items, hidden ones already removed. */
  visibleItems: CollectionItemWithBuilding[];
  markers: CollectionMarker[];
  /** Every pin the map could draw — used only to locate matches for the re-frame. */
  mapBuildings: DiscoveryBuilding[];
  activeTab: 'items' | 'itinerary';
}

export interface CollectionSearchState {
  query: string;
  setQuery: (value: string) => void;
  /** The settled query — what the filtering and the on-screen chips reflect. */
  appliedQuery: string;
  /** True when a usable query is active on a tab that supports searching. */
  isActive: boolean;
  searchedItems: CollectionItemWithBuilding[];
  searchedMarkers: CollectionMarker[];
  matchedIds: Set<string>;
  /** Everything searchable — the denominator in "3 of 24". */
  searchableCount: number;
  /** Non-null only when at least one match has usable coordinates. */
  resultBounds: Bounds | null;
  /** Pass to the map; the camera moves only when the token changes. */
  fitBoundsRequest: { bounds: Bounds; token: number } | null;
  requestZoomToResults: () => void;
}

export function useCollectionSearch({
  visibleItems,
  markers,
  mapBuildings,
  activeTab,
}: UseCollectionSearchArgs): CollectionSearchState {
  const [searchParams, setSearchParams] = useSearchParams();
  // Seeded from ?q= so a filtered view survives reload and can be shared.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const debouncedQuery = useDebounce(query, 200);
  const [fitToken, setFitToken] = useState(0);

  // Mirror the settled query back into ?q=. `replace: true` keeps typing out of
  // history; the functional updater leaves the map's own lat/lng/zoom intact.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        if ((prev.get("q") ?? "") === debouncedQuery) return prev;
        const next = new URLSearchParams(prev);
        if (debouncedQuery) next.set("q", debouncedQuery);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }, [debouncedQuery, setSearchParams]);

  const isActive = activeTab === 'items' && isSearchActive(debouncedQuery);
  const effectiveQuery = isActive ? debouncedQuery : '';

  const searchedItems = useMemo(
    () => filterCollectionItems(visibleItems, effectiveQuery),
    [visibleItems, effectiveQuery],
  );
  const searchedMarkers = useMemo(
    () => filterCollectionMarkers(markers, effectiveQuery),
    [markers, effectiveQuery],
  );
  const matchedIds = useMemo(
    () =>
      new Set<string>([
        ...searchedItems.map((item) => item.building.id),
        ...searchedMarkers.map((marker) => marker.id),
      ]),
    [searchedItems, searchedMarkers],
  );

  const resultBounds = useMemo(() => {
    if (!isActive) return null;
    return getBoundsFromBuildings(mapBuildings.filter((b) => matchedIds.has(b.id)));
  }, [isActive, mapBuildings, matchedIds]);

  const fitBoundsRequest = useMemo(
    () => (resultBounds && fitToken > 0 ? { bounds: resultBounds, token: fitToken } : null),
    [resultBounds, fitToken],
  );

  return {
    query,
    setQuery,
    appliedQuery: debouncedQuery,
    isActive,
    searchedItems,
    searchedMarkers,
    matchedIds,
    searchableCount: visibleItems.length + markers.length,
    resultBounds,
    fitBoundsRequest,
    requestZoomToResults: () => setFitToken((token) => token + 1),
  };
}
