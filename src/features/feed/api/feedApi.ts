import { supabase } from "@/integrations/supabase/client";
import {
  creditedEntitiesFromRpcJson,
  type FeedConnector,
  type FeedReview,
  type RawFeedRow,
  type RawFeedReviewImageRow,
} from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

/**
 * Service layer for the two-section home feed.
 *
 * - {@link fetchFollowingFeedPage} → `get_feed_ranked` (posts from people you
 *   follow + your own), seen-aware so only *new* updates surface.
 * - {@link fetchCommunityFeedPage} → `get_community_feed_ranked` (discovery from
 *   non-followed authors), carrying popularity/location/second-degree signals.
 *
 * Both RPCs return the same row shape (plus discovery extras), so a single
 * {@link mapRawFeedRow} normalizes them into the {@link FeedReview} DTO.
 */

export function parseReviewImages(raw: unknown): RawFeedReviewImageRow[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as RawFeedReviewImageRow[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as RawFeedReviewImageRow[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseConnectors(raw: unknown): FeedConnector[] | undefined {
  let arr: unknown = raw;
  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr) as unknown;
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const out: FeedConnector[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (rec.id == null) continue;
    out.push({
      id: String(rec.id),
      username: rec.username != null ? String(rec.username) : null,
      avatar_url: rec.avatar_url != null ? String(rec.avatar_url) : null,
    });
  }
  return out.length > 0 ? out : undefined;
}

export function mapRawFeedRow(review: RawFeedRow): FeedReview {
  const connectors = parseConnectors(review.connectors);
  return {
    id: review.id,
    content: review.content,
    rating: review.rating,
    tags: review.tags,
    created_at: review.created_at,
    edited_at: review.edited_at,
    status: review.status ?? undefined,
    user_id: review.user_id,
    user: {
      username: review.user_data?.username ?? null,
      avatar_url: review.user_data?.avatar_url ?? null,
      is_verified_architect: review.user_data?.is_verified_architect ?? false,
      is_architect_of_building:
        review.user_data?.is_architect_of_building ?? false,
      followers_count:
        typeof review.user_data?.followers_count === "number"
          ? review.user_data.followers_count
          : null,
    },
    building: {
      id: review.building_data?.id ?? review.building_id ?? "",
      short_id: review.building_data?.short_id,
      slug: review.building_data?.slug,
      name: review.building_data?.name ?? "Unknown Building",
      address: review.building_data?.address ?? null,
      city: review.building_data?.city ?? null,
      country: review.building_data?.country ?? null,
      main_image_url: review.building_data?.main_image_url ?? null,
      community_preview_url: review.building_data?.community_preview_url ?? null,
      creditedEntities: creditedEntitiesFromRpcJson(
        review.building_data?.credited_entities,
      ),
      year_completed: review.building_data?.year_completed ?? null,
      locality_country_code: review.building_data?.locality_country_code ?? null,
      locality_city_slug: review.building_data?.locality_city_slug ?? null,
    },
    likes_count: Number(review.likes_count ?? 0),
    comments_count: Number(review.comments_count ?? 0),
    views_count: Number(review.views_count ?? 0),
    is_liked: Boolean(review.is_liked),
    images: parseReviewImages(review.review_images).map((img) => ({
      id: img.id,
      url: getBuildingImageUrl(img.storage_path) ?? "",
      likes_count: img.likes_count ?? 0,
      is_liked: img.is_liked ?? false,
    })),
    is_suggested: review.is_suggested,
    suggestion_reason: review.suggestion_reason ?? undefined,
    ring: review.ring ?? undefined,
    connectors,
    connectors_count:
      typeof review.connectors_count === "number"
        ? review.connectors_count
        : connectors?.length,
    location_match: review.location_match ?? undefined,
  };
}

function mapRows(data: unknown): FeedReview[] {
  return ((data ?? []) as unknown as RawFeedRow[])
    .filter((r) => r.status !== "ignored")
    .map((row) => {
      try {
        return mapRawFeedRow(row);
      } catch {
        return null;
      }
    })
    .filter((r): r is FeedReview => r != null);
}

/** Posts from people the viewer follows (+ their own), seen-aware, score-ranked. */
export async function fetchFollowingFeedPage(
  limit: number,
  offset: number,
): Promise<FeedReview[]> {
  // get_feed_ranked is not always present in generated types; cast loosely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_feed_ranked", {
    p_limit: limit,
    p_offset: offset,
    p_exclude_seen: true,
  });
  if (error) throw error;
  return mapRows(data);
}

/** Discovery feed from non-followed authors, ranked by popularity/location/proximity. */
export async function fetchCommunityFeedPage(
  limit: number,
  offset: number,
): Promise<FeedReview[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "get_community_feed_ranked",
    { p_limit: limit, p_offset: offset },
  );
  if (error) throw error;
  return mapRows(data);
}

export function followingFeedKey(userId: string | undefined) {
  return ["home-feed", userId] as const;
}

export function communityFeedKey(userId: string | undefined) {
  return ["community-feed", userId] as const;
}
