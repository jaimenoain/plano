/**
 * useCollectionRailView.ts
 *
 * Owns the collection page's Collection / Discover / All view and the itinerary
 * lens over it, and hands back everything both panes need already derived.
 *
 * Session state, deliberately: not persisted, not in the URL. The *sources* it
 * chooses between are preferences (`useCollectionMapPreferences`); which of
 * them you are looking at right now is a lens on a page you arrived at from a
 * link, and a link that reopened someone else's Discover would be a surprise.
 *
 * The stored value is never corrected — see `railView.ts` for why the rendered
 * view is derived from it instead.
 */
import { useState } from "react";
import {
  resolveRailView,
  shouldShowRailToggle,
  showsCollection,
  showsDiscovery,
  type CollectionRailView,
  type RailViewContext,
} from "../railView";

interface UseCollectionRailViewArgs extends RailViewContext {
  /** A route has been generated, so the roster can be read day by day. */
  hasItinerary: boolean;
}

export interface CollectionRailViewState {
  /** The view to render — the stored one, minus any source that has gone away. */
  view: CollectionRailView;
  setView: (view: CollectionRailView) => void;
  itineraryView: boolean;
  setItineraryView: (value: boolean) => void;
  /** There is a second layer, so the segments are worth drawing. */
  showToggle: boolean;
  showsCollection: boolean;
  showsDiscovery: boolean;
  /** The itinerary is on AND there is one AND a roster is on screen. */
  showItinerary: boolean;
  /** Discover is the view minus the collection — that is all this ever meant. */
  hideCollectionPins: boolean;
}

export function useCollectionRailView({
  hasSavedPlacesLayer,
  hasDiscoveryLayer,
  hasItinerary,
}: UseCollectionRailViewArgs): CollectionRailViewState {
  const [stored, setView] = useState<CollectionRailView>("collection");
  const [itineraryView, setItineraryView] = useState(false);

  const ctx = { hasSavedPlacesLayer, hasDiscoveryLayer };
  const view = resolveRailView(stored, ctx);
  const holdsCollection = showsCollection(view);

  return {
    view,
    setView,
    itineraryView,
    setItineraryView,
    showToggle: shouldShowRailToggle(ctx),
    showsCollection: holdsCollection,
    showsDiscovery: showsDiscovery(view),
    showItinerary: itineraryView && hasItinerary && holdsCollection,
    hideCollectionPins: view === "discover",
  };
}
