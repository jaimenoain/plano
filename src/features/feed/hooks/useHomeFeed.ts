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
} from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

const PAGE_SIZE = 20;

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
    likes_count: review.likes_count ?? 0,
    comments_count: review.comments_count ?? 0,
    views_count: review.views_count ?? 0,
    is_liked: review.is_liked,
    images: (review.review_images ?? []).map((img) => ({
      id: img.id,
      url: getBuildingImageUrl(img.storage_path) ?? "",
      likes_count: img.likes_count ?? 0,
      is_liked: img.is_liked ?? false,
    })),
    is_suggested: review.is_suggested,
    suggestion_reason: review.suggestion_reason ?? undefined,
  };
}

export function useHomeFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["home-feed", user?.id] as const;

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_feed", {
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      });

      if (error) throw error;

      const feedData = (data ?? []) as unknown as RawFeedRow[];
      return feedData
        .filter((r) => r.status !== "ignored")
        .map(mapRawFeedRow);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE
        ? (lastPageParam as number) + PAGE_SIZE
        : undefined,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
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
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    toggleLike,
    toggleImageLike,
  };
}
