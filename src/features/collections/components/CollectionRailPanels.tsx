/**
 * CollectionRailPanels.tsx
 *
 * The body of the collection rail: whichever sections the current view calls
 * for, in one shared scroller.
 *
 * The view is a filter over the same page, not three separate tabs, so the
 * sections compose rather than switch — All is literally the Collection view's
 * band followed by Discover's. Bands only get a heading when there is more than
 * one of them; a single-section view says what it is in its own lead-in and a
 * heading over it would be a label on a label.
 *
 * Discover's content is the union of whichever *sources* Collection Settings has
 * on: saved places first (the viewer's own shortlist, and the shorter of the
 * two), then the catalogue. That is what makes the toggle's visibility rule
 * honest — it appears exactly when one of those sources is on, so it can never
 * offer a view with nothing to put in it.
 *
 * Presentational: the page owns every query, every mutation and the scroller.
 */
import type { ComponentProps, ReactNode, RefObject } from "react";
import type { DiscoveryBuilding } from "@/features/search";
import type { Bounds } from "@/utils/map";
import { showsCollection, showsDiscovery, type CollectionRailView } from "../railView";
import { CollectionDiscoverPanel } from "./CollectionDiscoverPanel";
import { CollectionItemsPanel } from "./CollectionItemsPanel";
import { ItineraryList } from "./ItineraryList";
import { SavedPlacesInViewList } from "./SavedPlacesInViewList";

export interface RailDiscoverSources {
  collectionId: string;
  /** The settled map viewport; null until the map's first move-end. */
  bounds: Bounds | null;
  excludeBuildingIds: Set<string>;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  /** The editor-only catalogue layer is on. */
  hasCatalogue: boolean;
  /** The saved-places layer is on. */
  hasSavedPlaces: boolean;
  /** Saved places in view, already minus the collection and filtered. */
  savedPlaces: DiscoveryBuilding[];
  canEdit: boolean;
  onAddSavedPlace: (building: { id: string; name?: string | null }) => Promise<void>;
  onAddAllSavedPlaces: () => void;
  isAddingAllSavedPlaces: boolean;
}

interface CollectionRailPanelsProps {
  view: CollectionRailView;
  /** Read the roster day by day instead of as a list. Already ANDed with having one. */
  itineraryView: boolean;
  itemsPanelProps: ComponentProps<typeof CollectionItemsPanel>;
  itineraryProps: ComponentProps<typeof ItineraryList>;
  discover: RailDiscoverSources;
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="eyebrow border-b border-border-default bg-surface-muted/40 px-4 py-2">
      {children}
    </h2>
  );
}

export function CollectionRailPanels({
  view,
  itineraryView,
  itemsPanelProps,
  itineraryProps,
  discover,
}: CollectionRailPanelsProps) {
  const showCollection = showsCollection(view);
  const showDiscovery = showsDiscovery(view);
  const showSavedPlaces = showDiscovery && discover.hasSavedPlaces;
  const showCatalogue = showDiscovery && discover.hasCatalogue;

  // Headings earn their place only once a view holds more than one band.
  const sectionCount =
    (showCollection ? 1 : 0) + (showSavedPlaces ? 1 : 0) + (showCatalogue ? 1 : 0);
  const labelled = sectionCount > 1;

  const collectionBand = itineraryView ? (
    <div className="p-4">
      <ItineraryList {...itineraryProps} />
    </div>
  ) : (
    <CollectionItemsPanel {...itemsPanelProps} />
  );

  return (
    <div className="pb-24 lg:pb-4">
      {showCollection && (
        <>
          {labelled && <SectionHeading>In this collection</SectionHeading>}
          {collectionBand}
        </>
      )}

      {showSavedPlaces && (
        <>
          {labelled ? (
            <SectionHeading>Your saved places in view</SectionHeading>
          ) : (
            <p className="border-b border-border-default px-4 py-3 text-xs leading-relaxed text-text-secondary">
              Places you’ve saved that sit in this map view and aren’t in the collection yet. Move
              the map to change the list.
            </p>
          )}
          <SavedPlacesInViewList
            buildings={discover.savedPlaces}
            hasBounds={!!discover.bounds}
            canEdit={discover.canEdit}
            onAdd={discover.onAddSavedPlace}
            onAddAll={discover.onAddAllSavedPlaces}
            isAddingAll={discover.isAddingAllSavedPlaces}
          />
        </>
      )}

      {showCatalogue && (
        <>
          {labelled && <SectionHeading>Elsewhere in this view</SectionHeading>}
          <CollectionDiscoverPanel
            collectionId={discover.collectionId}
            bounds={discover.bounds}
            excludeBuildingIds={discover.excludeBuildingIds}
            scrollRootRef={discover.scrollRootRef}
            variant={labelled ? "section" : "standalone"}
          />
        </>
      )}
    </div>
  );
}
