/**
 * CollectionRailViewToggle.tsx
 *
 * The collection rail's destination switch: Collection / Discover / All.
 *
 * It is the same `SegmentedControl` /search draws for All / Discover / My map,
 * on purpose — the two pages are asking the same question in the same words, so
 * they should not answer it in two different controls (the rail used to render
 * a boxed Radix tab strip here).
 *
 * Itinerary is deliberately NOT a fourth segment. This control decides *which
 * buildings* are in play; an itinerary is a lens on one of those sets, so it
 * rides underneath as a pressed-state chip and appears only when there is an
 * itinerary to read and a roster to read it over. Four segments would have said
 * "route" and "catalogue" were alternatives of the same kind.
 *
 * Presentational only: the page owns both pieces of state and both panes.
 */
import { Route } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { RAIL_VIEW_OPTIONS, showsCollection, type CollectionRailView } from "../railView";

interface CollectionRailViewToggleProps {
  view: CollectionRailView;
  onViewChange: (view: CollectionRailView) => void;
  /**
   * A second layer is on, so there is a choice to offer. When it isn't, the
   * itinerary chip can still be — a collection with a route but no discovery
   * source has one view and two ways to read it.
   */
  showViewToggle: boolean;
  /** A route has been generated, so the roster can be read day by day. */
  hasItinerary: boolean;
  itineraryView: boolean;
  onItineraryViewChange: (value: boolean) => void;
}

export function CollectionRailViewToggle({
  view,
  onViewChange,
  showViewToggle,
  hasItinerary,
  itineraryView,
  onItineraryViewChange,
}: CollectionRailViewToggleProps) {
  // No roster on screen, nothing to lay out as a route.
  const offersItinerary = hasItinerary && showsCollection(view);

  return (
    <div className="space-y-2">
      {showViewToggle && (
        <SegmentedControl
          name="collection-rail-view"
          options={RAIL_VIEW_OPTIONS}
          value={view}
          onValueChange={(value) => onViewChange(value as CollectionRailView)}
        />
      )}
      {offersItinerary && (
        <button
          type="button"
          aria-pressed={itineraryView}
          onClick={() => onItineraryViewChange(!itineraryView)}
          className={cn(
            "inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-medium transition-colors",
            itineraryView
              ? "border-text-primary bg-text-primary text-text-inverse"
              : "border-border-default text-text-secondary hover:text-text-primary",
          )}
        >
          <Route className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          Itinerary
        </button>
      )}
    </div>
  );
}
