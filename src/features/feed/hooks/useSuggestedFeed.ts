import { useCallback } from "react";
import { useInfiniteQuery, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { FeedReview, RawFeedRow, creditedEntitiesFromRpcJson } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

interface UseSuggestedFeedOptions {
  enabled?: boolean;
}

export function useSuggestedFeed(options: UseSuggestedFeedOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const LIMIT = 10;
  const { enabled = true } = options;

  const queryKey = ["suggested_feed", user?.id];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_suggested_posts", {
        p_limit: LIMIT,
        p_offset: pageParam,
      });

      if (error) throw error;

      const posts = (data || []) as unknown as RawFeedRow[];

      if (posts.length === 0) return [];

      return posts.map((post) => {
        const buildingData = post.building_data;
        const userData = post.user_data;

        return {
          id: post.id,
          content: post.content,
          rating: post.rating,
          tags: post.tags,
          created_at: post.created_at,
          edited_at: post.edited_at,
          status: post.status,
          user_id: post.user_id,
          group_id: post.group_id,
          user: {
            username: userData?.username || null,
            avatar_url: userData?.avatar_url || null,
            is_verified_architect: userData?.is_verified_architect || false,
            is_architect_of_building: userData?.is_architect_of_building || false,
            followers_count:
              typeof userData?.followers_count === "number"
                ? userData.followers_count
                : null,
          },
          building: {
            id: buildingData?.id,
            short_id: buildingData?.short_id,
            slug: buildingData?.slug,
            name: buildingData?.name || "Unknown Building",
            address: buildingData?.address || null,
            city: buildingData?.city || null,
            country: buildingData?.country || null,
            main_image_url:
              (buildingData as { hero_image_url?: string | null; main_image_url?: string | null } | null)
                ?.hero_image_url ??
              (buildingData as { main_image_url?: string | null } | null)?.main_image_url ??
              null,
            community_preview_url:
              buildingData?.community_preview_url ?? null,
            creditedEntities: creditedEntitiesFromRpcJson(
              buildingData?.credited_entities,
            ),
            year_completed: buildingData?.year_completed || null,
            locality_country_code: buildingData?.locality_country_code ?? null,
            locality_city_slug: buildingData?.locality_city_slug ?? null,
          },
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          views_count: post.views_count || 0,
          is_liked: post.is_liked,
          images: (post.review_images || []).map((img) => ({
            id: img.id,
            url: getBuildingImageUrl(img.storage_path),
            likes_count: img.likes_count || 0,
            is_liked: img.is_liked ?? false,
          })),
          is_suggested: post.is_suggested,
          suggestion_reason: post.suggestion_reason,
        } as FeedReview;
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < LIMIT) return undefined;
      return allPages.length * LIMIT;
    },
    enabled: !!user && enabled,
    initialPageParam: 0,
    staleTime: 60 * 1000,
  });

  const toggleLike = useCallback(async (reviewId: string) => {
    if (!user) return;

    const currentData = queryClient.getQueryData<InfiniteData<FeedReview[]>>(queryKey);
    if (!currentData) return;

    const review = currentData.pages.flatMap(p => p).find(r => r.id === reviewId);
    if (!review) return;

    // Optimistic Update
    queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (oldData) => {
      if (!oldData) return undefined;
      return {
        ...oldData,
        pages: oldData.pages.map((page) =>
          page.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  is_liked: !r.is_liked,
                  likes_count: r.is_liked ? r.likes_count - 1 : r.likes_count + 1,
                }
              : r
          )
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
      // Revert
      queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (oldData) => {
          if (!oldData) return undefined;
          return {
              ...oldData,
              pages: oldData.pages.map((page) =>
                  page.map((r) =>
                      r.id === reviewId ? { ...r, is_liked: review.is_liked, likes_count: review.likes_count } : r
                  )
              )
          }
      });
    }
  }, [user, queryClient, queryKey]);

  const toggleImageLike = useCallback(async (reviewId: string, imageId: string) => {
    if (!user) return;

    const currentData = queryClient.getQueryData<InfiniteData<FeedReview[]>>(queryKey);
    if (!currentData) return;

    const review = currentData.pages.flatMap(p => p).find(r => r.id === reviewId);
    if (!review) return;

    const image = review.images?.find(i => i.id === imageId);
    if (!image) return;

    // Optimistic Update
    queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (oldData) => {
      if (!oldData) return undefined;
      return {
        ...oldData,
        pages: oldData.pages.map((page) =>
          page.map((r) => {
            if (r.id === reviewId) {
                return {
                    ...r,
                    images: r.images?.map(img => {
                        if (img.id === imageId) {
                            return {
                                ...img,
                                is_liked: !img.is_liked,
                                likes_count: img.is_liked ? img.likes_count - 1 : img.likes_count + 1
                            };
                        }
                        return img;
                    })
                };
            }
            return r;
          })
        ),
      };
    });

    try {
        if (image.is_liked) {
            await supabase.from('image_likes').delete().eq('user_id', user.id).eq('image_id', imageId);
        } else {
            await supabase.from('image_likes').insert({ user_id: user.id, image_id: imageId });
        }
    } catch {
        // Revert
         queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (oldData) => {
            if (!oldData) return undefined;
            return {
                ...oldData,
                pages: oldData.pages.map((page) =>
                page.map((r) => {
                    if (r.id === reviewId) {
                        return {
                            ...r,
                            images: r.images?.map(img => {
                                if (img.id === imageId) {
                                    return {
                                        ...img,
                                        is_liked: image.is_liked,
                                        likes_count: image.likes_count
                                    };
                                }
                                return img;
                            })
                        };
                    }
                    return r;
                })
                ),
            };
        });
    }
  }, [user, queryClient, queryKey]);

  return {
    ...query,
    toggleLike,
    toggleImageLike
  };
}
