import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getBuildingImageUrl } from "@/utils/image";
export function useSuggestedFeed(options = {}) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const LIMIT = 10;
    const { enabled = true } = options;
    const queryKey = ["suggested_feed", user?.id];
    const query = useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam = 0 }) => {
            if (!user)
                return [];
            const { data, error } = await supabase.rpc("get_suggested_posts", {
                p_limit: LIMIT,
                p_offset: pageParam,
            });
            if (error)
                throw error;
            const posts = (data || []);
            if (posts.length === 0)
                return [];
            // Extract review IDs to fetch images
            const reviewIds = posts.map((p) => p.id);
            // Fetch images
            const { data: imagesData } = await supabase
                .from('review_images')
                .select('*')
                .in('review_id', reviewIds);
            // Fetch image likes for current user to determine is_liked status for images
            let likedImageIds = new Set();
            const imageRows = (imagesData || []);
            if (imageRows.length > 0) {
                const imageIds = imageRows.map((img) => img.id);
                const { data: likesData } = await supabase
                    .from('image_likes')
                    .select('image_id')
                    .eq('user_id', user.id)
                    .in('image_id', imageIds);
                if (likesData) {
                    likedImageIds = new Set(likesData.map((l) => l.image_id));
                }
            }
            const imagesMap = imageRows.reduce((acc, img) => {
                if (!acc[img.review_id]) {
                    acc[img.review_id] = [];
                }
                acc[img.review_id].push({
                    id: img.id,
                    url: getBuildingImageUrl(img.storage_path) || "",
                    likes_count: img.likes_count || 0,
                    is_liked: likedImageIds.has(img.id)
                });
                return acc;
            }, {});
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
                    },
                    building: {
                        id: buildingData?.id,
                        short_id: buildingData?.short_id,
                        slug: buildingData?.slug,
                        name: buildingData?.name || "Unknown Building",
                        address: buildingData?.address || null,
                        city: buildingData?.city || null,
                        country: buildingData?.country || null,
                        main_image_url: buildingData?.main_image_url || null,
                        architects: buildingData?.architects || null,
                        year_completed: buildingData?.year_completed || null,
                    },
                    likes_count: post.likes_count || 0,
                    comments_count: post.comments_count || 0,
                    is_liked: post.is_liked,
                    images: imagesMap[post.id] || [],
                    is_suggested: post.is_suggested,
                    suggestion_reason: post.suggestion_reason,
                };
            });
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < LIMIT)
                return undefined;
            return allPages.length * LIMIT;
        },
        enabled: !!user && enabled,
        initialPageParam: 0,
    });
    const toggleLike = async (reviewId) => {
        if (!user)
            return;
        const currentData = queryClient.getQueryData(queryKey);
        if (!currentData)
            return;
        const review = currentData.pages.flatMap(p => p).find(r => r.id === reviewId);
        if (!review)
            return;
        // Optimistic Update
        queryClient.setQueryData(queryKey, (oldData) => {
            if (!oldData)
                return undefined;
            return {
                ...oldData,
                pages: oldData.pages.map((page) => page.map((r) => r.id === reviewId
                    ? {
                        ...r,
                        is_liked: !r.is_liked,
                        likes_count: r.is_liked ? r.likes_count - 1 : r.likes_count + 1,
                    }
                    : r)),
            };
        });
        try {
            if (review.is_liked) {
                await supabase
                    .from("likes")
                    .delete()
                    .eq("interaction_id", reviewId)
                    .eq("user_id", user.id);
            }
            else {
                await supabase
                    .from("likes")
                    .insert({ interaction_id: reviewId, user_id: user.id });
            }
        }
        catch {
            // Revert
            queryClient.setQueryData(queryKey, (oldData) => {
                if (!oldData)
                    return undefined;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => page.map((r) => r.id === reviewId ? { ...r, is_liked: review.is_liked, likes_count: review.likes_count } : r))
                };
            });
        }
    };
    const toggleImageLike = async (reviewId, imageId) => {
        if (!user)
            return;
        const currentData = queryClient.getQueryData(queryKey);
        if (!currentData)
            return;
        const review = currentData.pages.flatMap(p => p).find(r => r.id === reviewId);
        if (!review)
            return;
        const image = review.images?.find(i => i.id === imageId);
        if (!image)
            return;
        // Optimistic Update
        queryClient.setQueryData(queryKey, (oldData) => {
            if (!oldData)
                return undefined;
            return {
                ...oldData,
                pages: oldData.pages.map((page) => page.map((r) => {
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
                })),
            };
        });
        try {
            if (image.is_liked) {
                await supabase.from('image_likes').delete().eq('user_id', user.id).eq('image_id', imageId);
            }
            else {
                await supabase.from('image_likes').insert({ user_id: user.id, image_id: imageId });
            }
        }
        catch {
            // Revert
            queryClient.setQueryData(queryKey, (oldData) => {
                if (!oldData)
                    return undefined;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => page.map((r) => {
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
                    })),
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
