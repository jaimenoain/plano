/**
 * collectionViewMode.ts
 *
 * Which pane the collection detail page opens on — Map or List.
 *
 * At `lg`+ both panes render side by side, so this only matters below that
 * breakpoint. There, the map alone is a poor first screen: no context until
 * you start moving pins, whereas the list is legible immediately. Mobile
 * therefore defaults to List; desktop keeps the existing Map default. An
 * explicit `?view=` in the URL, or a tap of the toggle, always wins over the
 * viewport-derived default (see useCollectionViewMode.ts).
 */
export type CollectionViewMode = "map" | "list";

/** Only the exact values the toggle can produce are honoured; anything else is absent. */
export function parseCollectionViewMode(raw: string | null): CollectionViewMode | null {
  return raw === "map" || raw === "list" ? raw : null;
}

/** The view to open on when nothing overrides it. */
export function resolveDefaultCollectionViewMode(isMobile: boolean): CollectionViewMode {
  return isMobile ? "list" : "map";
}
