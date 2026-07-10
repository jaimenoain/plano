import { getBuildingImageUrl } from "@/utils/image";

/**
 * Data types + transforms for the building community stream (reviews, photos,
 * videos). Extracted from `useBuildingInteractions` so the hook stays under its
 * file-size cap; everything here is pure/stateless and unit-testable.
 */

export interface FeedEntry {
  id: string;
  user_id: string;
  content: string | null;
  rating: number | null;
  status: "visited" | "pending";
  tags: string[] | null;
  created_at: string;
  user: {
    username: string | null;
    avatar_url: string | null;
    is_verified_architect?: boolean;
    is_architect_of_building?: boolean;
  };
  images: { id: string; storage_path: string; created_at?: string }[];
}

export interface RpcBuildingReviewRow {
  id: string;
  user_id: string;
  created_at: string;
  user_data: FeedEntry["user"] | null;
  images?: Array<{
    id: string;
    storage_path: string;
    likes_count?: number;
    created_at?: string;
    is_generated?: boolean;
    is_official?: boolean;
    caption?: string | null;
  }>;
  video_url?: string | null;
  content?: string | null;
  rating?: number | null;
  status?: FeedEntry["status"];
  tags?: string[] | null;
}

export interface DisplayImage {
  id: string;
  url: string;
  poster?: string;
  type?: "image" | "video";
  likes_count: number;
  created_at: string;
  user: { username: string | null; avatar_url: string | null } | null;
  is_generated?: boolean;
  is_official?: boolean;
  caption?: string | null;
}

/**
 * How many reviews to pull from get_building_reviews per page. The RPC returns
 * the highest-scoring reviews first (p_sort='top'), so the first page already
 * contains the best content; further pages are fetched on scroll.
 */
export const COMMUNITY_PAGE_SIZE = 30;

/**
 * Transform raw get_building_reviews rows into the flat community image list +
 * feed entries the page consumes. Pure (no hook state) so it can serve both the
 * initial fetch and incremental "load more" pages. Ordering is left to the
 * consumers (the page re-sorts images by likes and re-scores the stream).
 */
export function buildCommunityFromRows(rawEntries: RpcBuildingReviewRow[]): {
  images: DisplayImage[];
  entries: FeedEntry[];
} {
  const images: DisplayImage[] = [];

  rawEntries.forEach((entry) => {
    // Video entries
    if (entry.video_url) {
      let posterUrl: string | undefined;
      if (entry.images && entry.images.length > 0) {
        posterUrl = getBuildingImageUrl(entry.images[0].storage_path) || undefined;
      }
      images.push({
        id: `video-${entry.id}`,
        url: entry.video_url,
        poster: posterUrl,
        type: "video",
        likes_count: 0,
        created_at: entry.created_at,
        user: entry.user_data,
      });
    }
    // Image entries
    if (entry.images && entry.images.length > 0) {
      entry.images.forEach((img) => {
        const publicUrl = getBuildingImageUrl(img.storage_path);
        if (publicUrl) {
          images.push({
            id: img.id,
            url: publicUrl,
            type: "image",
            likes_count: img.likes_count || 0,
            created_at: img.created_at || entry.created_at,
            user: entry.user_data,
            is_generated: img.is_generated,
            is_official: img.is_official,
            caption: img.caption,
          });
        }
      });
    }
  });

  const entries: FeedEntry[] = rawEntries.map((e) => ({
    id: e.id,
    user_id: e.user_id,
    content: e.content ?? null,
    rating: e.rating ?? null,
    status: e.status ?? "visited",
    tags: e.tags ?? null,
    created_at: e.created_at,
    user: {
      username: e.user_data?.username ?? null,
      avatar_url: e.user_data?.avatar_url ?? null,
      is_verified_architect: e.user_data?.is_verified_architect,
      is_architect_of_building: e.user_data?.is_architect_of_building,
    },
    images: (e.images || []).map((img) => ({
      id: img.id,
      storage_path: img.storage_path,
      created_at: img.created_at,
    })),
  }));

  return { images, entries };
}

/** Order feed entries so followed users surface first, then most recent. */
export function sortEntriesFollowedFirst(
  list: FeedEntry[],
  followedIds: Set<string>,
): FeedEntry[] {
  return [...list].sort((a, b) => {
    const aFollowed = followedIds.has(a.user_id);
    const bFollowed = followedIds.has(b.user_id);
    if (aFollowed && !bFollowed) return -1;
    if (!aFollowed && bFollowed) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
