/**
 * CollectionItemsPanel.tsx
 *
 * The roster band of the collection rail — the Collection and All views: every building row, the
 * collapsible "Trip Logistics" group of non-building markers, and the two empty
 * states (an untouched collection versus a query that matched nothing — a query
 * wins, since an untouched collection matches nothing either).
 *
 * Extracted from `CollectionMapPage.tsx` unchanged. Presentational only — the
 * page still owns the data, the permissions and every mutation; it also owns the
 * scroll container, which is now the rail as a whole rather than this panel.
 *
 * The one exception is `CollectionSearchSuggestions`, which owns its own search
 * and its own insert: it hangs off the no-match empty state and is invisible to
 * everyone who cannot edit, so threading it through the page would have bought
 * nothing.
 */
import { Suspense, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/empty-state";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { CollectionItemRow } from "./CollectionItemRow";
import { CollectionSearchSuggestions } from "./CollectionSearchSuggestions";
import type { Collection, CollectionItemWithBuilding, CollectionMarker } from "../types";

const CollectionMarkerCard = lazyWithRetry(() =>
  import("@/features/collections/components/CollectionMarkerCard").then((module) => ({
    default: module.CollectionMarkerCard,
  })),
);

interface CollectionItemsPanelProps {
  collectionId: string;
  items: CollectionItemWithBuilding[];
  markers: CollectionMarker[];
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  canEdit: boolean;
  /** Display preferences that live on the collection row. */
  categorizationMethod: Collection["categorization_method"];
  customCategories: Collection["custom_categories"];
  showImages: boolean;
  showAddedBy: boolean;
  onUpdateNote: (itemId: string, note: string) => void;
  onUpdateCategory: (itemId: string, categoryId: string) => void;
  /** Omitted for viewers who may not edit — the row then hides its note editor. */
  onUpdateMarkerNote?: (markerId: string, note: string) => void;
  onSelect: (item: CollectionItemWithBuilding) => void;
  onRemove: (id: string) => void;
  /** Entries in the collection, ignoring the query. */
  searchableCount: number;
  /** True once the query has a usable token. */
  isSearchActive: boolean;
  appliedQuery: string;
  /** Entries matching the current query, across both buildings and markers. */
  matchCount: number;
  onClearSearch: () => void;
  /** Every building already in the collection, hidden ones included. */
  excludeBuildingIds: Set<string>;
  /**
   * Entries the map viewport is hiding right now (0 when the list is not
   * narrowed). The roster follows the map, so this is the counter that keeps
   * that honest — without it, zooming in reads as the collection losing rows.
   */
  outOfViewCount: number;
  /** Re-frames the map on the whole collection. Omitted when there is nothing to fit. */
  onZoomToCollection?: () => void;
}

export function CollectionItemsPanel({
  collectionId,
  items,
  markers,
  highlightedId,
  setHighlightedId,
  canEdit,
  categorizationMethod,
  customCategories,
  showImages,
  showAddedBy,
  onUpdateNote,
  onUpdateCategory,
  onUpdateMarkerNote,
  onSelect,
  onRemove,
  searchableCount,
  isSearchActive,
  appliedQuery,
  matchCount,
  onClearSearch,
  excludeBuildingIds,
  outOfViewCount,
  onZoomToCollection,
}: CollectionItemsPanelProps) {
  // An empty collection counts as a dead-end search too: the bar is always up, so
  // a query typed into one has to land somewhere, and for an editor that
  // somewhere is the suggestions below.
  const noMatches = isSearchActive && matchCount === 0;

  // Adding the first suggestion makes the query match, which would otherwise
  // pull the rest of the list out from under the cursor. Once suggestions are up
  // for a query they stay up until the query itself changes, so an editor can
  // add two or three in a row.
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);
  if (canEdit && noMatches && suggestingFor !== appliedQuery) setSuggestingFor(appliedQuery);
  const showSuggestions = canEdit && isSearchActive && suggestingFor === appliedQuery;

  // The viewport, not the query, emptied the list — a different dead end, and
  // one the user fixes by moving the map rather than by clearing anything.
  const emptiedByViewport =
    !noMatches && outOfViewCount > 0 && items.length === 0 && markers.length === 0;
  const zoomOutAction = onZoomToCollection ? (
    <button type="button" onClick={onZoomToCollection} className="cta-link">
      Zoom out to the whole collection
    </button>
  ) : undefined;

  return (
    <div className="space-y-3 p-4 pb-24 lg:pb-4">
      {items.map((item) => (
        <CollectionItemRow
          key={item.id}
          item={item}
          isHighlighted={highlightedId === item.building.id}
          setHighlightedId={setHighlightedId}
          canEdit={canEdit}
          onUpdateNote={(note) => onUpdateNote(item.id, note)}
          onSelect={() => onSelect(item)}
          categorizationMethod={categorizationMethod}
          customCategories={customCategories}
          onUpdateCategory={(categoryId) => onUpdateCategory(item.id, categoryId)}
          showImages={showImages}
          showAddedBy={showAddedBy}
          onRemove={() => onRemove(item.building.id)}
        />
      ))}

      {markers.length > 0 && (
        <div className="mt-4 border-t pt-2">
          <Accordion type="single" collapsible defaultValue="markers">
            <AccordionItem value="markers" className="border-none">
              <AccordionTrigger className="py-2 text-sm font-semibold text-text-secondary hover:no-underline">
                Trip Logistics
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <Suspense
                    fallback={
                      <div className="p-2 text-center text-xs text-text-secondary">
                        Loading markers...
                      </div>
                    }
                  >
                    {markers.map((marker) => (
                      <CollectionMarkerCard
                        key={marker.id}
                        marker={marker}
                        isHighlighted={highlightedId === marker.id}
                        setHighlightedId={setHighlightedId}
                        canEdit={canEdit}
                        onRemove={() => onRemove(marker.id)}
                        onNavigate={() => setHighlightedId(marker.id)}
                        onUpdateNote={
                          onUpdateMarkerNote
                            ? (note) => onUpdateMarkerNote(marker.id, note)
                            : undefined
                        }
                      />
                    ))}
                  </Suspense>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {searchableCount === 0 && !isSearchActive && (
        <div className="py-8 text-center text-sm text-text-secondary">
          No places in this collection yet.
        </div>
      )}

      {emptiedByViewport && (
        <EmptyState
          eyebrow="Nothing in view"
          message={`${outOfViewCount} ${outOfViewCount === 1 ? "place is" : "places are"} outside this view.`}
          action={zoomOutAction}
        />
      )}

      {/* The list follows the map, so say what the map is leaving out. */}
      {outOfViewCount > 0 && !emptiedByViewport && (
        <div className="mt-4 border-t border-border-default pt-3 text-center text-xs text-text-secondary">
          <span>
            {outOfViewCount} more outside this view
          </span>
          {zoomOutAction && <div className="mt-1">{zoomOutAction}</div>}
        </div>
      )}

      {noMatches && (
        <EmptyState
          eyebrow="No matches"
          message={`Nothing in this collection matches “${appliedQuery}”.`}
          action={
            <button type="button" onClick={onClearSearch} className="cta-link">
              Clear search
            </button>
          }
        />
      )}

      {/* A search with no match is where an editor most wants the rest of the
          database — so the same query keeps going, into buildings they can add. */}
      {showSuggestions && (
        <CollectionSearchSuggestions
          collectionId={collectionId}
          query={appliedQuery}
          excludeBuildingIds={excludeBuildingIds}
        />
      )}
    </div>
  );
}
