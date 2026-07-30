// Field mode — the photo gaps nearest the ambassador, for shooting on foot (roadmap 4.3).
//
// Backed by get_ambassador_nearby_photo_gaps() (20271197000000_embassy_field_mode.sql),
// which scopes to the caller's chapter, filters to buildings with no photo at all, and
// orders by real distance from the given position. The desk list
// (get_ambassador_buildings_without_photos) answers a different question — most popular
// gap anywhere in the chapter — and returns no coordinates, so it cannot back this.

import { supabase } from "@/integrations/supabase/client";

/**
 * The radius ladder. Start tight enough that everything is walkable; one tap widens.
 * Ordered narrowest first — the page walks this array, so adding a step is a one-line change.
 */
export const FIELD_RADII_METERS = [2000, 10000] as const;

export const FIELD_GAP_LIMIT = 30;

export type NearbyPhotoGap = {
  id: string;
  shortId: number;
  slug: string;
  name: string;
  city: string | null;
  lat: number;
  lng: number;
  /** Metres from the position the query was made with. */
  distanceMeters: number;
};

/**
 * The caller's active chapter. Field mode is reachable directly by URL, so it resolves its
 * own membership rather than depending on a parent having done it.
 */
export async function fetchMyActiveChapterId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("ambassador_memberships")
    .select("chapter_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: false })
    .maybeSingle();
  if (error) throw error;
  return data?.chapter_id ?? null;
}

export async function fetchNearbyPhotoGaps(args: {
  chapterId: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  limit?: number;
}): Promise<NearbyPhotoGap[]> {
  const { data, error } = await supabase.rpc("get_ambassador_nearby_photo_gaps", {
    p_chapter_id: args.chapterId,
    p_lat: args.lat,
    p_lng: args.lng,
    p_radius_meters: args.radiusMeters,
    p_limit: args.limit ?? FIELD_GAP_LIMIT,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    shortId: row.short_id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    distanceMeters: row.dist_meters,
  }));
}

/**
 * Pure formatter: metres up to a kilometre, then kilometres to one decimal — the same
 * convention the building-page nearby list uses, so distances read the same everywhere.
 * Exported for unit testing.
 */
export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres) || metres < 0) return "—";
  if (metres < 1000) return `${Math.round(metres)} m`;
  // Trailing ".0" reads as false precision on a round radius ("2 km", not "2.0 km").
  return `${(metres / 1000).toFixed(1).replace(/\.0$/, "")} km`;
}

/**
 * Pure: the label for the button that widens the search, or null when there is nowhere
 * wider to go. Exported for unit testing.
 */
export function nextRadiusAfter(radiusMeters: number): number | null {
  const idx = FIELD_RADII_METERS.indexOf(radiusMeters as (typeof FIELD_RADII_METERS)[number]);
  if (idx === -1) return null;
  return FIELD_RADII_METERS[idx + 1] ?? null;
}
