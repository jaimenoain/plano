/**
 * useCollectionDiscoverInView.ts
 *
 * The catalogue half of the Discover view's data: catalogue buildings inside the collection map's
 * current viewport that the collection doesn't already hold.
 *
 * Pins and rows come from two different RPCs over the same bbox — the split
 * /search has always run, and the reason the map can cluster while the list
 * stays legible. What that costs is recorded in ADR 0024; the short version is
 * that a cluster bubble's count and this list's length are not the same number,
 * which is why nothing here is ever presented as one.
 */
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Bounds } from "@/utils/map";
import { addBuildingToCollection } from "../api/collectionItems";
import {
  DISCOVER_PAGE_SIZE,
  fetchBuildingsInView,
  type DiscoverInViewRow,
} from "../api/discoverInView";

/**
 * Widest bbox worth listing, in degrees. `get_buildings_list` takes no ranking
 * preference, so a continent-wide page 1 is an arbitrary twenty buildings — and
 * at that zoom the map is drawing opaque cluster bubbles anyway. Better to ask
 * for a zoom than to answer with noise.
 */
export const MAX_DISCOVER_SPAN_DEG = 20;

/**
 * Ceiling on the content-level top-up below. Bounds the work when a collection
 * owns most of what is in view; beyond this the user can scroll for more.
 */
export const MAX_AUTOFILL_PAGES = 5;

/** ~110m. Coarse enough that move-end jitter can't re-key the query. */
const KEY_PRECISION = 3;

function roundBounds(bounds: Bounds) {
  const round = (n: number) => Number(n.toFixed(KEY_PRECISION));
  return {
    north: round(bounds.north),
    south: round(bounds.south),
    east: round(bounds.east),
    west: round(bounds.west),
  };
}

function isSpanTooWide(bounds: Bounds): boolean {
  return (
    Math.abs(bounds.north - bounds.south) > MAX_DISCOVER_SPAN_DEG ||
    Math.abs(bounds.east - bounds.west) > MAX_DISCOVER_SPAN_DEG
  );
}

interface UseCollectionDiscoverInViewArgs {
  collectionId: string;
  /** The settled map viewport; null until the map's first move-end. */
  bounds: Bounds | null;
  /** Every building already in the collection — never offered back. */
  excludeBuildingIds: Set<string>;
}

export interface CollectionDiscoverInView {
  buildings: DiscoverInViewRow[];
  /** The viewport covers too much ground to rank meaningfully. */
  isTooWide: boolean;
  /** Page 1 in flight with nothing cached to show. */
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetching: boolean;
  fetchNextPage: () => void;
  pageCount: number | undefined;
  addBuilding: (building: { id: string; name: string }) => void;
  /** The building currently being added, so only its own button spins. */
  addingId: string | null;
}

export function useCollectionDiscoverInView({
  collectionId,
  bounds,
  excludeBuildingIds,
}: UseCollectionDiscoverInViewArgs): CollectionDiscoverInView {
  const queryClient = useQueryClient();
  const [addingId, setAddingId] = useState<string | null>(null);

  const isTooWide = !!bounds && isSpanTooWide(bounds);
  const isEnabled = !!bounds && !isTooWide;

  const query = useInfiniteQuery({
    // Deliberately not keyed on `collectionId`: the collection is subtracted
    // client-side, so adding a building must not throw away fetched pages.
    queryKey: ["collection-discover-in-view", bounds ? roundBounds(bounds) : null],
    queryFn: ({ pageParam }) => fetchBuildingsInView(bounds!, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === DISCOVER_PAGE_SIZE ? allPages.length + 1 : undefined,
    enabled: isEnabled,
    // Hold the previous view's rows while a pan's bbox loads, so moving the map
    // never blinks the list back to skeletons.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const { data, hasNextPage, isFetching, isFetchingNextPage, fetchNextPage } = query;
  const pageCount = data?.pages.length;

  const buildings = useMemo(() => {
    if (!data) return [];
    return data.pages.flat().filter((row) => !excludeBuildingIds.has(row.id));
  }, [data, excludeBuildingIds]);

  // Content-level top-up. The shared sentinel's own probe is geometric, and here
  // it measures the whole rail — masthead and toolbar included — so it reads
  // "already overflows" and stays silent no matter how short the list is. That
  // matters because a page where every row was subtracted as already-collected
  // is the *normal* case for a well-worked collection in its home city: without
  // this the tab would sit empty with page 2 unreachable, no scroll possible.
  useEffect(() => {
    if (!isEnabled || !hasNextPage || isFetching || isFetchingNextPage) return;
    if (buildings.length > 0) return;
    if ((pageCount ?? 0) >= MAX_AUTOFILL_PAGES) return;
    fetchNextPage();
  }, [
    isEnabled,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    buildings.length,
    pageCount,
    fetchNextPage,
  ]);

  const addMutation = useMutation({
    mutationFn: (building: { id: string; name: string }) => {
      setAddingId(building.id);
      return addBuildingToCollection(collectionId, building.id);
    },
    onSuccess: (_result, building) => {
      toast.success(`${building.name} added to collection`);
      // The page's items query. Refreshing it moves the building out of this
      // list and into the Collection tab, and updates the map and the count.
      void queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
    },
    onError: () => {
      toast.error("Could not add that building to the collection.");
    },
    onSettled: () => setAddingId(null),
  });

  return {
    buildings,
    isTooWide,
    isLoading: isEnabled && isFetching && !data,
    isError: query.isError,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
    pageCount,
    addBuilding: addMutation.mutate,
    addingId,
  };
}
