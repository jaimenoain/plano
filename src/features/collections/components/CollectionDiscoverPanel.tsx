/**
 * CollectionDiscoverPanel.tsx
 *
 * The catalogue half of the rail's Discover view: buildings in the current map
 * view that this collection doesn't hold yet, each one addable in a tap.
 *
 * It follows the map rather than the collection, which is the whole point — the
 * Collection view next door still holds the roster, so an editor scouting in
 * discovery mode can compare the two instead of losing one of them.
 *
 * It renders two ways. `standalone` is the whole Discover view and carries its
 * own lead-in; `section` is one labelled band inside a view that already has
 * others (All, or a Discover that also lists saved places), where a second
 * lead-in would only repeat the heading sitting above it.
 *
 * Rows are `BuildingListRow`, the same row /search's browse list draws from the
 * same RPC. They are plain links: a discovered building is usually inside a
 * server-side cluster, so there is no pin to cross-highlight and pretending
 * otherwise would be a gesture that silently does nothing (ADR 0024).
 */
import type { RefObject } from "react";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { BuildingListRow, useInfiniteScrollSentinel } from "@/features/maps";
import type { Bounds } from "@/utils/map";
import { resolveBuildingUrl } from "@/utils/url";
import { useCollectionDiscoverInView } from "../hooks/useCollectionDiscoverInView";
import { AddToCollectionButton } from "./AddToCollectionButton";

interface CollectionDiscoverPanelProps {
  collectionId: string;
  /** The settled map viewport; null until the map's first move-end. */
  bounds: Bounds | null;
  /** Buildings already in the collection — never offered. */
  excludeBuildingIds: Set<string>;
  /** The rail's shared scroll viewport: the infinite-scroll observer's root. */
  scrollRootRef: RefObject<HTMLDivElement | null>;
  /** `section` drops the lead-in and the trailing gutter; a heading supplies both. */
  variant?: "standalone" | "section";
}

function DiscoverSkeletons() {
  return (
    <div aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-3 border-b border-border-default px-4 py-3 last:border-0">
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-[72px] w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function CollectionDiscoverPanel({
  collectionId,
  bounds,
  excludeBuildingIds,
  scrollRootRef,
  variant = "standalone",
}: CollectionDiscoverPanelProps) {
  const {
    buildings,
    isTooWide,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
    pageCount,
    addBuilding,
    addingId,
  } = useCollectionDiscoverInView({ collectionId, bounds, excludeBuildingIds });

  const { targetRef } = useInfiniteScrollSentinel({
    enabled: buildings.length > 0,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
    pageCount,
    scrollRootRef,
  });

  function renderBody() {
    if (!bounds) {
      return (
        <EmptyState
          eyebrow="Waiting for the map"
          message="Move or zoom the map and this list fills with what’s in view."
        />
      );
    }
    if (isTooWide) {
      return (
        <EmptyState
          eyebrow="Zoom in to discover"
          message="This view covers too much ground to be useful. Zoom in and the list fills with what’s actually around."
        />
      );
    }
    if (isError) {
      return (
        <EmptyState
          eyebrow="Couldn’t load this view"
          message="Something went wrong fetching buildings here. Move the map to try again."
        />
      );
    }
    if (isLoading) return <DiscoverSkeletons />;
    if (buildings.length === 0) {
      return (
        <EmptyState
          eyebrow="Nothing left to add here"
          message="Every building in this view is already in the collection, or Plano has none catalogued here yet. Move the map to find more."
        />
      );
    }

    return (
      <>
        {buildings.map((building) => (
          <BuildingListRow
            key={building.id}
            href={resolveBuildingUrl(building)}
            name={building.name}
            altName={building.alt_name}
            creditNames={building.credit_names}
            city={building.city}
            imageUrl={building.image_url}
            rating={building.rating}
            status={building.status}
            constructionStatus={building.construction_status}
            // A plain click follows the link to the building: the row has no pin
            // of its own, so there is no drawer to open instead.
            onSelect={() => {}}
            actionSlot={
              <div className="absolute right-3 top-3 z-10">
                <AddToCollectionButton
                  buildingName={building.name}
                  isAdding={addingId === building.id}
                  disabled={addingId !== null}
                  onAdd={() => addBuilding({ id: building.id, name: building.name })}
                />
              </div>
            }
          />
        ))}
        <div ref={targetRef} aria-hidden className="h-px" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
            <span className="sr-only">Loading more buildings</span>
          </div>
        )}
        {!hasNextPage && (
          <p className="px-4 py-4 text-center text-xs text-text-secondary">End of this view.</p>
        )}
      </>
    );
  }

  // The rail's own wrapper owns the bottom gutter, so both variants end flush.
  return (
    <>
      {variant === "standalone" && (
        <p className="border-b border-border-default px-4 py-3 text-xs leading-relaxed text-text-secondary">
          Buildings in this map view that aren’t in the collection yet. Move the map to change the
          list.
        </p>
      )}
      {renderBody()}
    </>
  );
}
