import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { FeedReview } from "@/types/feed";
import {
  fetchFollowingFeedPage,
  followingFeedKey,
} from "@/features/feed/api/feedApi";
import { useFeedLikes } from "@/features/feed/hooks/useFeedLikes";
import { getBuildingImageUrl } from "@/utils/image";

const PAGE_SIZE = 20;

type FallbackPostRow = {
  id: string;
  body: string | null;
  title: string | null;
  created_at: string;
  user_id: string;
  building_id: string;
  user: { username: string | null; avatar_url: string | null } | null;
  building: {
    id: string;
    slug: string | null;
    name: string;
    city: string | null;
    country: string | null;
    community_preview_url: string | null;
    year_completed: number | null;
  } | null;
  images: { id: string; storage_path: string }[] | null;
};

function mapFallbackPostRow(row: FallbackPostRow): FeedReview {
  return {
    id: row.id,
    content: row.body ?? row.title,
    rating: null,
    created_at: row.created_at,
    status: "visited",
    user_id: row.user_id,
    user: {
      username: row.user?.username ?? null,
      avatar_url: row.user?.avatar_url ?? null,
      is_verified_architect: false,
      is_architect_of_building: false,
      followers_count: null,
    },
    building: {
      id: row.building?.id ?? row.building_id,
      slug: row.building?.slug ?? null,
      name: row.building?.name ?? "Unknown Building",
      city: row.building?.city ?? null,
      country: row.building?.country ?? null,
      community_preview_url: row.building?.community_preview_url ?? null,
      year_completed: row.building?.year_completed ?? null,
    },
    likes_count: 0,
    comments_count: 0,
    views_count: 0,
    is_liked: false,
    images: (row.images ?? []).map((img) => ({
      id: img.id,
      url: getBuildingImageUrl(img.storage_path) ?? "",
      likes_count: 0,
      is_liked: false,
    })),
  };
}

/** Direct table read when feed RPCs are unavailable (migration not applied, etc.). */
async function fetchFeedPageFallback(
  limit: number,
  offset: number,
  userId: string,
): Promise<FeedReview[]> {
  const { data: follows, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (followsError) throw followsError;

  const authorIds = [
    userId,
    ...new Set((follows ?? []).map((f) => f.following_id)),
  ];

  const { data, error } = await supabase
    .from("building_posts")
    .select(
      `
      id,
      body,
      title,
      created_at,
      user_id,
      building_id,
      user:profiles!building_posts_user_id_fkey(username, avatar_url),
      building:buildings!building_posts_building_id_fkey(
        id,
        slug,
        name,
        city,
        country,
        community_preview_url,
        year_completed
      ),
      images:review_images(id, storage_path)
    `,
    )
    .in("user_id", authorIds)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return ((data ?? []) as unknown as FallbackPostRow[]).map(mapFallbackPostRow);
}

async function fetchHomeFeedPage(
  limit: number,
  offset: number,
  userId: string,
): Promise<FeedReview[]> {
  try {
    return await fetchFollowingFeedPage(limit, offset);
  } catch {
    return fetchFeedPageFallback(limit, offset, userId);
  }
}

/**
 * "New from people you follow" — the seen-aware followed feed. Returns only
 * posts the viewer has not yet seen (server-side via `get_feed_ranked`), so on a
 * return visit this section surfaces nothing but new updates.
 */
export function useHomeFeed() {
  const { user } = useAuth();
  const queryKey = followingFeedKey(user?.id);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];
      return fetchHomeFeedPage(PAGE_SIZE, pageParam, user.id);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE
        ? (lastPageParam as number) + PAGE_SIZE
        : undefined,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const reviews = query.data?.pages.flat() ?? [];
  const { toggleLike, toggleImageLike } = useFeedLikes(queryKey);

  return {
    reviews,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    toggleLike,
    toggleImageLike,
  };
}
