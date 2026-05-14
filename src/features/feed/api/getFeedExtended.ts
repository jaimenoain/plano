import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  creditedEntitiesFromRpcJson,
  type RawFeedRow,
  type RawFeedReviewImageRow,
} from "@/types/feed";
import type { FeedItem } from "@/types/feedItem";
import { getBuildingImageUrl } from "@/utils/image";

interface EndorserRow {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface RawFeedExtendedRow extends RawFeedRow {
  score: number;
  ring: string;
  freshness_hours: number;
  endorsers: EndorserRow[];
}

interface GetFeedExtendedOptions {
  limit?: number;
  offset?: number;
}

/**
 * Builds the "why am I seeing this" attribution string for ring-2 (extended)
 * feed items. Exported so it can be unit-tested independently.
 *
 * Rules:
 *   0 endorsers → "Liked by someone you follow"         (fallback)
 *   1 endorser  → "Liked by ${name}, who you follow"
 *   2 endorsers → "Liked by ${name1} and ${name2}"
 *   3+ endorsers → "Liked by ${name1} and ${count - 1} others you follow"
 */
export function buildExtendedAttribution(
  endorsers: Array<{ username: string }>,
): string {
  const count = endorsers.length;
  if (count === 0) return "Liked by someone you follow";
  const first = endorsers[0].username;
  if (count === 1) return `Liked by ${first}, who you follow`;
  if (count === 2) return `Liked by ${first} and ${endorsers[1].username}`;
  return `Liked by ${first} and ${count - 1} others you follow`;
}

/**
 * Calls `get_feed_extended` and maps rows to the `FeedItem` discriminated union.
 *
 * Ring-2 content surfaces posts liked by ring-1 (directly-followed) users.
 * Each item carries an endorsers list for the attribution string and for
 * potential inline "endorsed by" UI treatment in a later phase.
 */
export async function getFeedExtended({
  limit = 20,
  offset = 0,
}: GetFeedExtendedOptions = {}): Promise<FeedItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_feed_extended", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawFeedExtendedRow[];

  return rows
    .filter((r) => r.status !== "ignored")
    .map((row): FeedItem => {
      const endorsers = Array.isArray(row.endorsers) ? row.endorsers : [];
      const authorName = row.user_data?.username ?? "Unknown";
      const relativeTime = formatDistanceToNow(new Date(row.created_at), {
        addSuffix: true,
      });

      return {
        kind: "post",
        id: row.id,
        ring: "extended",
        score: row.score ?? 0,
        attribution: {
          kind: "extended",
          text: buildExtendedAttribution(endorsers),
        },
        payload: {
          id: row.id,
          content: row.content,
          rating: row.rating,
          tags: row.tags,
          created_at: row.created_at,
          edited_at: row.edited_at,
          status: row.status ?? undefined,
          user_id: row.user_id,
          user: {
            username: row.user_data?.username ?? null,
            avatar_url: row.user_data?.avatar_url ?? null,
            is_verified_architect: row.user_data?.is_verified_architect ?? false,
            is_architect_of_building:
              row.user_data?.is_architect_of_building ?? false,
            followers_count:
              typeof row.user_data?.followers_count === "number"
                ? row.user_data.followers_count
                : null,
          },
          building: {
            id: row.building_data?.id ?? "",
            short_id: row.building_data?.short_id,
            slug: row.building_data?.slug,
            name: row.building_data?.name ?? "Unknown Building",
            address: row.building_data?.address,
            city: row.building_data?.city,
            country: row.building_data?.country,
            main_image_url: row.building_data?.main_image_url,
            community_preview_url: row.building_data?.community_preview_url,
            creditedEntities: creditedEntitiesFromRpcJson(
              row.building_data?.credited_entities,
            ),
            year_completed: row.building_data?.year_completed,
            locality_country_code: row.building_data?.locality_country_code,
            locality_city_slug: row.building_data?.locality_city_slug,
          },
          likes_count: row.likes_count ?? 0,
          comments_count: row.comments_count ?? 0,
          views_count: row.views_count ?? 0,
          is_liked: row.is_liked,
          images: ((row.review_images ?? []) as RawFeedReviewImageRow[])
            .map((img) => ({
              id: img.id,
              url: getBuildingImageUrl(img.storage_path) ?? "",
              likes_count: img.likes_count ?? 0,
              is_liked: img.is_liked ?? false,
            })),
          // Store the raw author name + relative time for supplementary display.
          // The primary attribution text comes from buildExtendedAttribution().
          suggestion_reason: `${authorName} · ${relativeTime}`,
        },
      };
    });
}
