import type { FeedReview, ReviewImage } from "@/types/feed";
import type { DisplayImage } from "@/features/buildings/hooks/useBuildingInteractions";

/** Minimal entry shape from building reviews stream (matches `FeedEntry` in BuildingDetails). */
export interface BuildingFeedEntry {
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

export interface BuildingSummaryForFeed {
  id: string;
  name: string;
  slug: string | null;
  short_id: number | null;
  address?: string | null;
  main_image_url?: string | null;
  community_preview_url?: string | null;
}

/**
 * Map a building review row + resolved display images to {@link FeedReview} for card resolvers.
 */
export function buildingEntryToFeedReview(
  entry: BuildingFeedEntry,
  building: BuildingSummaryForFeed,
  displayImageById: Map<string, DisplayImage>,
  likedImageIds: Set<string>,
): FeedReview {
  const images: ReviewImage[] = [];
  for (const ref of entry.images) {
    const d = displayImageById.get(ref.id);
    if (!d || d.type === "video") continue;
    images.push({
      id: d.id,
      url: d.url,
      likes_count: d.likes_count,
      is_liked: likedImageIds.has(d.id),
    });
  }

  const videoImg = displayImageById.get(`video-${entry.id}`);
  const video_url =
    videoImg?.type === "video" && videoImg.url ? videoImg.url : null;

  return {
    id: entry.id,
    content: entry.content,
    rating: entry.rating,
    created_at: entry.created_at,
    edited_at: null,
    status: entry.status,
    user_id: entry.user_id,
    tags: entry.tags,
    user: {
      username: entry.user.username,
      avatar_url: entry.user.avatar_url,
      is_verified_architect: entry.user.is_verified_architect,
      is_architect_of_building: entry.user.is_architect_of_building,
      followers_count: null,
    },
    building: {
      id: building.id,
      name: building.name,
      slug: building.slug,
      short_id: building.short_id,
      address: building.address ?? null,
      main_image_url: building.main_image_url ?? null,
      community_preview_url: building.community_preview_url ?? null,
    },
    likes_count: 0,
    comments_count: 0,
    is_liked: false,
    images: images.length > 0 ? images : undefined,
    video_url,
  };
}
