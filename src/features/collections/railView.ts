/**
 * railView.ts
 *
 * What the collection page is showing — in the rail and on the map at once.
 *
 * The collection is to a collection map what the library is to /search, so the
 * rail borrows that page's vocabulary exactly (ADR 0025): Collection is the
 * roster's own pins, Discover is what is in view minus the roster, All is both.
 * One control, both panes, so the list and the map can never disagree about
 * which buildings are in play.
 *
 * The control only exists once there is a second layer to choose between —
 * "Show Saved Places" or "Show All Buildings" in Collection Settings. Those two
 * decide which *sources* are available; this decides which of them you are
 * looking at. With neither on, a collection map shows a collection, and a
 * toggle offering the same thing three ways would be noise.
 *
 * A source can vanish under a viewer standing on Discover, so the rendered view
 * is *derived* from the stored one rather than corrected afterwards in an
 * effect — no stale frame, and no setState-in-effect for StrictMode to
 * double-invoke. Keeping the stored value untouched is deliberate: flick a
 * source off and back on within a session and the rail returns where you left
 * it.
 */
export type CollectionRailView = "collection" | "discover" | "all";

export interface RailViewContext {
  /** The viewer's own saved places are drawn as addable candidates. */
  hasSavedPlacesLayer: boolean;
  /** The editor-only catalogue discovery layer is on. */
  hasDiscoveryLayer: boolean;
}

/** True when the map holds anything beyond the collection itself. */
export function hasNonCollectionLayer(ctx: RailViewContext): boolean {
  return ctx.hasSavedPlacesLayer || ctx.hasDiscoveryLayer;
}

/** The view to render: collapses to "collection" the moment no source is on. */
export function resolveRailView(
  stored: CollectionRailView,
  ctx: RailViewContext,
): CollectionRailView {
  return hasNonCollectionLayer(ctx) ? stored : "collection";
}

/** The toggle is worth drawing only when there is somewhere else to go. */
export function shouldShowRailToggle(ctx: RailViewContext): boolean {
  return hasNonCollectionLayer(ctx);
}

/** Narrowest first, then widening — the default sits where the eye lands. */
export const RAIL_VIEW_OPTIONS: { label: string; value: CollectionRailView }[] = [
  { label: "Collection", value: "collection" },
  { label: "Discover", value: "discover" },
  { label: "All", value: "all" },
];

/** The collection's own entries are part of this view. */
export function showsCollection(view: CollectionRailView): boolean {
  return view !== "discover";
}

/** Buildings the collection does not hold are part of this view. */
export function showsDiscovery(view: CollectionRailView): boolean {
  return view !== "collection";
}
