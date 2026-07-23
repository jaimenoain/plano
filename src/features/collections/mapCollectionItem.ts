import { parseLocation } from "@/utils/location";
import type { CollectionItemWithBuilding } from "./types";

/**
 * Maps a raw `collection_items` row (with embedded building + adder profile)
 * into the {@link CollectionItemWithBuilding} shape the UI consumes: parses the
 * PostGIS `location` into lat/lng and normalizes the embedded `added_by_user`
 * relation (PostgREST returns it as an object, generated types widen to array).
 * Returns `null` for rows whose building was deleted — caller filters those out.
 */
export function mapCollectionItem(item: unknown): CollectionItemWithBuilding | null {
  const row = item as {
    id: string;
    building_id: string;
    note: string | null;
    custom_category_id: string | null;
    is_hidden?: boolean;
    added_by?: string | null;
    added_by_user?: unknown;
    building?: { location?: unknown; building_credits?: unknown } & Record<string, unknown>;
  };
  const b = row.building;
  if (!b) return null;

  const location = parseLocation(b.location);
  const addedByRaw = row.added_by_user;
  const addedByUser = Array.isArray(addedByRaw) ? addedByRaw[0] : addedByRaw;

  return {
    id: row.id,
    building_id: row.building_id,
    note: row.note,
    custom_category_id: row.custom_category_id,
    is_hidden: row.is_hidden,
    added_by: row.added_by ?? null,
    added_by_user: (addedByUser as { id: string; username: string } | null) ?? null,
    building: {
      ...b,
      location_lat: location?.lat || 0,
      location_lng: location?.lng || 0,
      building_credits: b.building_credits || [],
    },
  } as CollectionItemWithBuilding;
}
