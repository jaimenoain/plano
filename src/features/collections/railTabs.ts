/**
 * railTabs.ts
 *
 * Which tab the collection rail is actually showing.
 *
 * The rail's tab strip is conditional twice over: the Itinerary tab exists only
 * once a route has been generated, and the Discover tab only while an editor has
 * the discovery layer switched on. Either can vanish under a user who is
 * standing on it, so the rendered tab is *derived* from the stored one rather
 * than corrected afterwards in an effect — a stored tab whose strip is gone
 * simply resolves to "items" on the very next render, with no stale frame and no
 * setState-in-effect for StrictMode to double-invoke.
 *
 * Keeping the stored value untouched is deliberate: flick discovery off and back
 * on within a session and the rail returns to Discover where you left it.
 */
export type CollectionRailTab = "items" | "itinerary" | "discover";

export interface RailTabContext {
  /** A route has been generated, so the Itinerary tab is offered. */
  hasItinerary: boolean;
  /** Editor-only discovery layer is on, so the Discover tab is offered. */
  discoveryEnabled: boolean;
}

/** The tab to render: falls back to "items" when the stored tab isn't on offer. */
export function resolveRailTab(stored: CollectionRailTab, ctx: RailTabContext): CollectionRailTab {
  if (stored === "itinerary" && !ctx.hasItinerary) return "items";
  if (stored === "discover" && !ctx.discoveryEnabled) return "items";
  return stored;
}

/** How many tabs are on offer — drives `grid-cols-*` on the boxed strip. */
export function railTabCount(ctx: RailTabContext): 1 | 2 | 3 {
  return (1 + (ctx.hasItinerary ? 1 : 0) + (ctx.discoveryEnabled ? 1 : 0)) as 1 | 2 | 3;
}

/** The strip is worth drawing only when there is somewhere else to go. */
export function shouldShowRailTabs(ctx: RailTabContext): boolean {
  return railTabCount(ctx) > 1;
}
