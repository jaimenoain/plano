import { useInfiniteQuery, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

const INITIAL_PAGE_SIZE = 10;
const SUBSEQUENT_PAGE_SIZE = 36;

interface UseFeedOptions {
  showGroupActivity: boolean;
}

export function useFeed({ showGroupActivity }: UseFeedOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["feed", user?.id, showGroupActivity];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const isFirstPage = pageParam === 0;
      const limit = isFirstPage ? INITIAL_PAGE_SIZE : SUBSEQUENT_PAGE_SIZE;
      const from = isFirstPage ? 0 : INITIAL_PAGE_SIZE + (pageParam - 1) * SUBSEQUENT_PAGE_SIZE;

      const { data, error } = await supabase
        .rpc("get_feed", {
          p_limit: limit,
          p_offset: from
        });

      if (error) throw error;

      const feedData = data || [];

      return feedData.filter((r: any) => r.status !== 'ignored').map((review: any) => ({
        id: review.id,
        content: review.content,
        rating: review.rating,
        tags: review.tags,
        created_at: review.created_at,
        edited_at: review.edited_at,
        status: review.status,
        user_id: review.user_id,
        group_id: review.group_id,
        user: {
          username: review.user_data?.username || null,
          avatar_url: review.user_data?.avatar_url || null,
          is_verified_architect: review.user_data?.is_verified_architect || false,
        },
        building: {
          id: review.building_data?.id,
          short_id: review.building_data?.short_id,
          slug: review.building_data?.slug,
          name: review.building_data?.name || "Unknown Building",
          address: review.building_data?.address || null,
          city: review.building_data?.city || null,
          country: review.building_data?.country || null,
          main_image_url: review.building_data?.main_image_url || null,
          architects: review.building_data?.architects || null,
          year_completed: review.building_data?.year_completed || null,
        },
        likes_count: review.likes_count || 0,
        comments_count: review.comments_count || 0,
        is_liked: review.is_liked,
        images: (review.review_images || []).map((img: any) => {
            return {
                id: img.id,
                url: getBuildingImageUrl(img.storage_path),
                likes_count: img.likes_count || 0,
                is_liked: img.is_liked
            };
        }),
        is_suggested: review.is_suggested,
        suggestion_reason: review.suggestion_reason,
      })) as FeedReview[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const isFirstPage = allPages.length === 1;
      const expectedSize = isFirstPage ? INITIAL_PAGE_SIZE : SUBSEQUENT_PAGE_SIZE;
      return lastPage.length === expectedSize ? allPages.length : undefined;
    },
    enabled: !!user,
  });

  const toggleLike = async (reviewId: string) => {
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
    } catch (error) {
      console.error("Error toggling like:", error);
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
  };

  const toggleImageLike = async (reviewId: string, imageId: string) => {
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
    } catch (error) {
        console.error("Error toggling image like:", error);
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
  };

  return {
    ...query,
    toggleLike,
    toggleImageLike
  };
}
