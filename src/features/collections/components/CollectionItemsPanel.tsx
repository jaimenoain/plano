/**
 * CollectionItemsPanel.tsx
 *
 * The body of the collection rail's All Items tab: every building row, the
 * collapsible "Trip Logistics" group of non-building markers, and the two empty
 * states (an untouched collection versus a query that matched nothing).
 *
 * Extracted from `CollectionMapPage.tsx` unchanged. Presentational only — the
 * page still owns the data, the permissions and every mutation; it also owns the
 * scroll container, which is now the rail as a whole rather than this panel.
 */
import { Suspense } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/empty-state";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { CollectionItemRow } from "./CollectionItemRow";
import type { Collection, CollectionItemWithBuilding, CollectionMarker } from "../types";

const CollectionMarkerCard = lazyWithRetry(() =>
  import("@/features/collections/components/CollectionMarkerCard").then((module) => ({
    default: module.CollectionMarkerCard,
  })),
);

interface CollectionItemsPanelProps {
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
}

export function CollectionItemsPanel({
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
}: CollectionItemsPanelProps) {
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

      {searchableCount === 0 && (
        <div className="py-8 text-center text-sm text-text-secondary">
          No places in this collection yet.
        </div>
      )}

      {searchableCount > 0 && isSearchActive && matchCount === 0 && (
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
    </div>
  );
}
