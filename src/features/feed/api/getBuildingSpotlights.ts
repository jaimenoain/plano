import { supabase } from "@/integrations/supabase/client";
import type { FeedItem, FeedItemBuildingSpotlight } from "@/types/feedItem";

interface RawSpotlightBuildingData {
  id: string;
  name: string;
  main_image_url: string | null;
  community_preview_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  slug: string | null;
  short_id: number | null;
  locality_country_code: string | null;
  locality_city_slug: string | null;
}

interface RawRing1Contributor {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface RawSpotlightRow {
  building_id: string;
  building_data: RawSpotlightBuildingData;
  time_window: "24h" | "7d" | "30d";
  posts_count: number;
  photos_count: number;
  ring1_contributors: RawRing1Contributor[] | null;
  ring: string;
  score: number;
  last_activity_at: string;
}

/**
 * Builds the "why am I seeing this" attribution string for spotlight cards.
 * Exported for unit testing.
 *
 * ring='direct': "${n} photo(s) from people you follow"
 * ring='open':   "Trending in ${city} today/this week" or "Trending today/this week"
 */
export function buildSpotlightAttribution(
  ring: "direct" | "open",
  photosCount: number,
  city: string | null,
  window: "24h" | "7d" | "30d",
): string {
  if (ring === "direct") {
    if (photosCount > 0) {
      return `${photosCount} photo${photosCount === 1 ? "" : "s"} from people you follow`;
    }
    return "Activity from people you follow";
  }
  const timeLabel = window === "24h" ? "today" : "this week";
  return city ? `Trending in ${city} ${timeLabel}` : `Trending ${timeLabel}`;
}

/**
 * Calls `get_building_spotlights` and maps rows to `FeedItemBuildingSpotlight`.
 *
 * Spotlight items use `spotlight:${buildingId}` as their feed id so they
 * cannot collide with post ids in seen-tracking or dedup logic.
 */
export async function getBuildingSpotlights({
  limit = 20,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<FeedItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_building_spotlights", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawSpotlightRow[];

  return rows.map((row): FeedItemBuildingSpotlight => {
    const bd = row.building_data ?? {};
    const contributors = Array.isArray(row.ring1_contributors) ? row.ring1_contributors : [];
    const ring = row.ring === "direct" ? "direct" : "open";

    return {
      kind: "building_spotlight",
      id: `spotlight:${row.building_id}`,
      ring,
      score: row.score ?? 0,
      attribution: {
        kind: ring,
        text: buildSpotlightAttribution(ring, row.photos_count ?? 0, bd.city ?? null, row.time_window),
      },
      payload: {
        buildingId: row.building_id,
        buildingName: bd.name ?? "Unknown Building",
        buildingCity: bd.city ?? null,
        mainImageUrl: bd.main_image_url ?? null,
        communityPreviewUrl: bd.community_preview_url ?? null,
        slug: bd.slug ?? null,
        shortId: bd.short_id ?? null,
        window: row.time_window,
        postsCount: row.posts_count ?? 0,
        photosCount: row.photos_count ?? 0,
        ring1Contributors: contributors.map((c) => ({
          id: c.id,
          username: c.username,
          avatarUrl: c.avatar_url ?? null,
        })),
        lastActivityAt: row.last_activity_at,
      },
    };
  });
}
