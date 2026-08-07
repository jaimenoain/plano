/**
 * useCollectionItemsInView.ts
 *
 * Narrows the collection rail's roster to what the map is actually showing.
 *
 * Roadmap Task 4.1 — "the SERP list shows exactly the items within the visible
 * map viewport", on the collection page as well as /map. The roster was a single
 * unbounded fetch of every `collection_items` row, so a user zoomed into one
 * city read a list of two hundred buildings against four pins.
 *
 * This is a pure client-side narrowing over data the page already holds — the
 * same shape as `useCollectionSearch`, and it composes after it: search decides
 * *what matches*, this decides *what is on screen*. Two gates keep it honest:
 *
 * - **No bounds yet** (first paint, before `CollectionMapGL` emits its settled
 *   viewport) passes everything through. Filtering against a null viewport would
 *   flash an empty rail on every load.
 * - **Itinerary view** passes everything through. An itinerary is a day
 *   sequence; dropping stop 3 because it is off-screen would renumber the walk.
 *   Same reasoning `useCollectionSearch` records for its own `isSearchable` gate.
 *
 * `outOfViewCount` is the honest counter behind the rail's "N more outside this
 * view" footer — the owner's condition for filtering at all, so nothing reads as
 * having silently vanished.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isLngLatInBounds, type Bounds } from "@/utils/map";
import type { DiscoveryBuilding } from "@/features/search";
import {
  matchesSavedPlacesDotFilter,
  matchesSavedPlacesStatusFilter,
} from "../collectionMapPreferences";
import type {
  CollectionItemWithBuilding,
  CollectionMarker,
  SavedPlacesDotFilter,
  SavedPlacesStatusFilter,
} from "../types";

interface UseCollectionItemsInViewArgs {
  /** Roster rows after the rail's text search, hidden ones already removed. */
  items: CollectionItemWithBuilding[];
  /** Non-building markers after the rail's text search. */
  markers: CollectionMarker[];
  /** The map's settled viewport; null until the map first reports one. */
  bounds: Bounds | null;
  /** False on views where narrowing would misrepresent the list (itinerary). */
  enabled: boolean;
  /** Saved-place candidates offered for adding, or null when that layer is off. */
  savedPlaces?: DiscoveryBuilding[] | null;
  /** Buildings already in the collection — never offered again. */
  excludeBuildingIds?: Set<string>;
  dotFilter?: SavedPlacesDotFilter;
  statusFilter?: SavedPlacesStatusFilter;
}

export interface CollectionItemsInView {
  itemsInView: CollectionItemWithBuilding[];
  markersInView: CollectionMarker[];
  /** Entries the viewport excluded — 0 whenever the narrowing is not applied. */
  outOfViewCount: number;
  /** True when the viewport is actually narrowing the list right now. */
  isNarrowed: boolean;
  /**
   * Saved places on screen and not yet collected — what the Discover band lists
   * and what "Add all in view" adds. Always [] when the layer is off or the map
   * has not reported a viewport, because "in view" is meaningless without one.
   */
  savedPlacesInView: DiscoveryBuilding[];
}

export function useCollectionItemsInView({
  items,
  markers,
  bounds,
  enabled,
  savedPlaces = null,
  excludeBuildingIds,
  dotFilter = "all",
  statusFilter = "all",
}: UseCollectionItemsInViewArgs): CollectionItemsInView {
  const savedPlacesInView = useMemo(() => {
    if (!savedPlaces?.length || !bounds) return [];
    return savedPlaces.filter(
      (c) =>
        !excludeBuildingIds?.has(c.id) &&
        matchesSavedPlacesDotFilter(c.personal_rating ?? null, dotFilter) &&
        matchesSavedPlacesStatusFilter(c.personal_status ?? null, statusFilter) &&
        isLngLatInBounds(c.location_lat, c.location_lng, bounds),
    );
  }, [savedPlaces, bounds, excludeBuildingIds, dotFilter, statusFilter]);

  const roster = useMemo(() => {
    if (!enabled || !bounds) {
      return { itemsInView: items, markersInView: markers, outOfViewCount: 0, isNarrowed: false };
    }

    const itemsInView = items.filter((item) =>
      isLngLatInBounds(item.building.location_lat, item.building.location_lng, bounds),
    );
    const markersInView = markers.filter((marker) =>
      isLngLatInBounds(marker.lat, marker.lng, bounds),
    );

    const outOfViewCount =
      items.length - itemsInView.length + (markers.length - markersInView.length);

    return { itemsInView, markersInView, outOfViewCount, isNarrowed: outOfViewCount > 0 };
  }, [items, markers, bounds, enabled]);

  return { ...roster, savedPlacesInView };
}

/**
 * Coalesces the collection map's two fit-bounds sources onto the single
 * `fitBoundsRequest` prop `CollectionMapGL` consumes: zoom-to-search-results
 * (owned by `useCollectionSearch`) and the roster footer's "Zoom out", which
 * re-frames the whole collection when the viewport has narrowed the list.
 *
 * One monotonic token, so a repeat request to the same bounds still fires and
 * the later source always wins — two independently-counting channels racing on
 * one prop would let a stale request stick.
 */
export function useCollectionMapFit(
  searchFitRequest: { bounds: Bounds; token: number } | null,
  collectionBounds: Bounds | null,
) {
  const tokenRef = useRef(0);
  const [fitRequest, setFitRequest] = useState<{ bounds: Bounds; token: number } | null>(null);

  const requestFit = useCallback((bounds: Bounds) => {
    tokenRef.current += 1;
    setFitRequest({ bounds, token: tokenRef.current });
  }, []);

  useEffect(() => {
    if (searchFitRequest) requestFit(searchFitRequest.bounds);
  }, [searchFitRequest, requestFit]);

  const fitToCollection = useCallback(() => {
    if (collectionBounds) requestFit(collectionBounds);
  }, [collectionBounds, requestFit]);

  // Undefined with nothing to fit, so callers can hide the control rather than
  // render a button that would do nothing.
  return { fitRequest, fitToCollection: collectionBounds ? fitToCollection : undefined };
}
