/**
 * collectionVisibility.ts
 *
 * One predicate for "does this collection item exist as far as the reader is
 * concerned?".
 *
 * A hidden item (`collection_items.is_hidden`) is a suppression tombstone, not a
 * membership: it is written so a building stops being suggested for the
 * collection, and it must never surface as a member — not as a pin, not as a
 * row in the rail, not as a stop in the itinerary, not in the exported CSV, not
 * in the public JSON-LD.
 *
 * It lives here rather than inline because the predicate used to be copy-pasted
 * at every consumer, and every copy was one omission away from leaking a hidden
 * building into a surface that had simply forgotten to filter.
 *
 * The one deliberate exception is the *suggestion* machinery, which needs hidden
 * items precisely so it can keep offering something it has been told to stop
 * offering — those call sites read `items` raw, on purpose.
 */
import type { CollectionItemWithBuilding } from "./types";

export function isVisibleCollectionItem(item: CollectionItemWithBuilding): boolean {
  return item.is_hidden !== true;
}

export function visibleCollectionItems(
  items: CollectionItemWithBuilding[] | null | undefined,
): CollectionItemWithBuilding[] {
  return (items ?? []).filter(isVisibleCollectionItem);
}
