/**
 * CollectionMapPage.helpers.ts
 *
 * Pure helpers extracted out of CollectionMapPage.tsx, which has no remaining
 * size budget — logic unchanged.
 */
import type { Collection, CollectionItemWithBuilding, CollectionMarker } from "../types";

/**
 * Only re-run itinerary store initialization when collection/items/markers meaningfully change.
 * TanStack Query refetches often return new array references with identical data; without this,
 * `initializeItinerary` wipes client state and feels like an unsolicited refresh.
 */
export function itinerarySourceFingerprint(
  collection: Collection,
  items: CollectionItemWithBuilding[],
  markers: CollectionMarker[],
): string {
  const itemPart = [...items]
    .map(
      (i) =>
        `${i.id}:${i.note ?? ""}:${i.custom_category_id ?? ""}:${i.building.location_lat}:${i.building.location_lng}:${i.building.name}`,
    )
    .sort()
    .join("|");
  const markerPart = [...markers]
    .map(
      (m) =>
        `${m.id}:${m.lat}:${m.lng}:${m.name}:${m.notes ?? ""}:${m.category}`,
    )
    .sort()
    .join("|");
  return `${collection.id}:${JSON.stringify(collection.itinerary)}:${itemPart}:${markerPart}`;
}

/** Returns a copy of the search params with the given keys removed (for consume-once deep links). */
export function withoutSearchParams(prev: URLSearchParams, ...keys: string[]): URLSearchParams {
  const next = new URLSearchParams(prev);
  keys.forEach((key) => next.delete(key));
  return next;
}
