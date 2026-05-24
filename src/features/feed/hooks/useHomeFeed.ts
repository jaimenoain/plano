import { useCallback } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  creditedEntitiesFromRpcJson,
  type FeedReview,
  type RawFeedRow,
  type RawFeedReviewImageRow,
} from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

const PAGE_SIZE = 20;

function parseReviewImages(raw: unknown): RawFeedReviewImageRow[] {
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

function mapRawFeedRow(review: RawFeedRow): FeedReview {
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
      is_architect_of_building: review.user_data?.is_architect_of_building ?? false,
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
  };
}

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

async function fetchFeedPageViaRpc(
  limit: number,
  offset: number,
): Promise<FeedReview[]> {
  const { data, error } = await supabase.rpc("get_feed", {
    p_limit: limit,
    p_offset: offset,
  });

  if (!error) {
    const feedData = (data ?? []) as unknown as RawFeedRow[];
    return feedData
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

  // Ranked RPC (optional; not always in generated types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ranked = await (supabase as any).rpc("get_feed_ranked", {
    p_limit: limit,
    p_offset: offset,
  });

  if (!ranked.error && ranked.data) {
    const feedData = (ranked.data ?? []) as unknown as RawFeedRow[];
    return feedData
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

  throw error;
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
    return await fetchFeedPageViaRpc(limit, offset);
  } catch {
    return fetchFeedPageFallback(limit, offset, userId);
  }
}

export function useHomeFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["home-feed", user?.id] as const;

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

  const toggleLike = useCallback(
    async (reviewId: string) => {
      if (!user) return;

      const currentData =
        queryClient.getQueryData<InfiniteData<FeedReview[]>>(queryKey);
      if (!currentData) return;

      const review = currentData.pages.flat().find((r) => r.id === reviewId);
      if (!review) return;

      queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (old) => {
        if (!old) return undefined;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((r) =>
              r.id === reviewId
                ? {
                    ...r,
                    is_liked: !r.is_liked,
                    likes_count: r.is_liked
                      ? r.likes_count - 1
                      : r.likes_count + 1,
                  }
                : r,
            ),
          ),
        };
      });

      try {
        if (review.is_liked) {
          await supabase
            .from("likes")
            .delete()
            .eq("interaction_id", reviewId)
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("likes")
            .insert({ interaction_id: reviewId, user_id: user.id });
        }
      } catch {
        queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, currentData);
      }
    },
    [queryClient, queryKey, user],
  );

  const toggleImageLike = useCallback(
    async (reviewId: string, imageId: string) => {
      if (!user) return;

      const currentData =
        queryClient.getQueryData<InfiniteData<FeedReview[]>>(queryKey);
      if (!currentData) return;

      const review = currentData.pages.flat().find((r) => r.id === reviewId);
      const image = review?.images?.find((img) => img.id === imageId);
      if (!review || !image) return;

      queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (old) => {
        if (!old) return undefined;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((r) =>
              r.id !== reviewId
                ? r
                : {
                    ...r,
                    images: r.images?.map((img) =>
                      img.id === imageId
                        ? {
                            ...img,
                            is_liked: !img.is_liked,
                            likes_count: img.is_liked
                              ? img.likes_count - 1
                              : img.likes_count + 1,
                          }
                        : img,
                    ),
                  },
            ),
          ),
        };
      });

      try {
        if (image.is_liked) {
          await supabase
            .from("likes")
            .delete()
            .eq("interaction_id", imageId)
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("likes")
            .insert({ interaction_id: imageId, user_id: user.id });
        }
      } catch {
        queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, currentData);
      }
    },
    [queryClient, queryKey, user],
  );

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
