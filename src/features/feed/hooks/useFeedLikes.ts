import { useCallback } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { FeedReview } from "@/types/feed";

/**
 * Optimistic like / image-like toggles for an infinite feed query, parameterized
 * by its query key. Shared by the followed feed ({@link useHomeFeed}) and the
 * community feed ({@link useCommunityFeed}) so both sections behave identically.
 */
export function useFeedLikes(queryKey: readonly unknown[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
        queryClient.setQueryData<InfiniteData<FeedReview[]>>(
          queryKey,
          currentData,
        );
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
        queryClient.setQueryData<InfiniteData<FeedReview[]>>(
          queryKey,
          currentData,
        );
      }
    },
    [queryClient, queryKey, user],
  );

  return { toggleLike, toggleImageLike };
}
