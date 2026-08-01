/**
 * CollectionMapOverlays.tsx
 *
 * The chips and buttons stacked in the collection map's bottom-left corner.
 *
 * Each one explains why the map looks the way it does and offers the one tap out
 * of it — which matters most on mobile, where the controls that caused the state
 * live in the other pane entirely.
 *
 * Presentational only: the page owns every piece of state and every mutation,
 * including the decision of whether this stack is worth rendering at all (the
 * map wraps whatever it is handed in a spaced container, so an empty stack would
 * still cost a gap).
 */
import { Loader2, MapPinPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CollectionRailView } from "../railView";

/** What the discovery chip says the map is currently drawing. */
const VIEW_LABEL: Record<CollectionRailView, string> = {
  collection: "Discovery available",
  discover: "Discovery · collection hidden",
  all: "Discovery view",
};

interface CollectionMapOverlaysProps {
  canEdit: boolean;
  /** A collection search is narrowing the pins. */
  searchApplies: boolean;
  appliedQuery: string;
  onClearSearch: () => void;
  /** The saved-places suggestion layer is on. */
  showSavedCandidates: boolean;
  addInViewCount: number;
  isAddInViewDisabled: boolean;
  isAddingInView: boolean;
  onAddInView: () => void;
  /** The discovery layer is on. */
  showAllBuildings: boolean;
  /** Which of the available layers the rail toggle is showing. */
  view: CollectionRailView;
  onExitDiscovery: () => void;
}

export function CollectionMapOverlays({
  canEdit,
  searchApplies,
  appliedQuery,
  onClearSearch,
  showSavedCandidates,
  addInViewCount,
  isAddInViewDisabled,
  isAddingInView,
  onAddInView,
  showAllBuildings,
  view,
  onExitDiscovery,
}: CollectionMapOverlaysProps) {
  return (
    <>
      {/* Why pins are missing. Without this the filter is invisible on mobile,
          where the search box lives in the other pane. */}
      {searchApplies && (
        <div className="flex items-center gap-2 border border-border-default bg-surface-card/90 px-2 py-1.5 backdrop-blur-xs">
          <span className="truncate text-xs text-text-secondary">
            Filtered: “{appliedQuery}”
          </span>
          <button
            type="button"
            onClick={onClearSearch}
            aria-label="Clear collection search"
            className="shrink-0 text-text-disabled transition-colors hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {showSavedCandidates && canEdit ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full shadow-none border border-border-default bg-surface-card/95 backdrop-blur-xs"
          disabled={addInViewCount === 0 || isAddInViewDisabled}
          onClick={onAddInView}
        >
          {isAddingInView ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />
              Adding…
            </>
          ) : (
            <>
              <MapPinPlus className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">
                Add in view
                {addInViewCount > 0 ? ` (${addInViewCount})` : ""}
              </span>
            </>
          )}
        </Button>
      ) : null}

      {/* The discovery layer changes what the map means; say so, and make it one
          tap to leave — especially once the collection's own pins are hidden. */}
      {showAllBuildings && canEdit ? (
        <div className="flex items-center gap-2 border border-border-default bg-surface-card/90 px-2 py-1.5 backdrop-blur-xs">
          <span className="truncate text-xs text-text-secondary">{VIEW_LABEL[view]}</span>
          <button
            type="button"
            onClick={onExitDiscovery}
            aria-label="Turn off discovery view"
            className="shrink-0 text-text-disabled transition-colors hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      ) : null}
    </>
  );
}
