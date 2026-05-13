import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { FeedItem } from "@/types/feedItem";
import {
  creditedEntitiesFromRpcJson,
  type RawFeedRow,
  type RawFeedReviewImageRow,
} from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

interface RawSuggestedPostRow extends RawFeedRow {
  ring?: string;
}

interface GetSuggestedPostsAsItemsOptions {
  limit?: number;
  offset?: number;
}

/**
 * Freshness + engagement score matching the formula in get_feed_ranked SQL,
 * computed in TypeScript for the discovery (ring='open') source.
 *
 *   freshness_decay     = exp(-ln(2) * hoursOld / 36)
 *   engagement_velocity = (likes + 2 * comments) / max(1, hoursOld)
 *   media_quality       = 1.4 (3+ img) | 1.2 (2 img) | 1.0 (1 img) | 0.7 (none)
 *   score               = freshness_decay * (1 + 0.5 * min(engagement_velocity, 10)) * media_quality
 */
function scoreSuggestedPost(
  createdAt: string,
  likesCount: number,
  commentsCount: number,
  imageCount: number,
): number {
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  const freshnessDecay = Math.exp((-Math.LN2 * hoursOld) / 36);
  const engagementVelocity = (likesCount + 2 * commentsCount) / Math.max(1, hoursOld);
  const mediaQuality =
    imageCount >= 3 ? 1.4 : imageCount === 2 ? 1.2 : imageCount === 1 ? 1.0 : 0.7;
  return freshnessDecay * (1 + 0.5 * Math.min(engagementVelocity, 10)) * mediaQuality;
}

export async function getSuggestedPostsAsItems({
  limit = 30,
  offset = 0,
}: GetSuggestedPostsAsItemsOptions = {}): Promise<FeedItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_suggested_posts", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawSuggestedPostRow[];

  return rows.map((row): FeedItem => {
    const authorName = row.user_data?.username ?? "Unknown";
    const relativeTime = formatDistanceToNow(new Date(row.created_at), { addSuffix: true });
    const images = (row.review_images ?? []) as RawFeedReviewImageRow[];
    const likesCount = row.likes_count ?? 0;
    const commentsCount = row.comments_count ?? 0;

    return {
      kind: "post",
      id: row.id,
      ring: "open",
      score: scoreSuggestedPost(row.created_at, likesCount, commentsCount, images.length),
      attribution: {
        kind: "open",
        text: `${authorName} · ${relativeTime}`,
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
          is_architect_of_building: row.user_data?.is_architect_of_building ?? false,
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
        likes_count: likesCount,
        comments_count: commentsCount,
        views_count: row.views_count ?? 0,
        is_liked: row.is_liked,
        images: images.map((img) => ({
          id: img.id,
          url: getBuildingImageUrl(img.storage_path) ?? "",
          likes_count: img.likes_count ?? 0,
          is_liked: img.is_liked ?? false,
        })),
        is_suggested: row.is_suggested,
        suggestion_reason: row.suggestion_reason ?? undefined,
      },
    };
  });
}
