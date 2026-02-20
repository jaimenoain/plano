import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

export function useSuggestedFeed() {
  const { user } = useAuth();
  const LIMIT = 10;

  return useInfiniteQuery({
    queryKey: ["suggested_feed", user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_suggested_posts", {
        p_limit: LIMIT,
        p_offset: pageParam,
      });

      if (error) throw error;

      const posts = data || [];

      if (posts.length === 0) return [];

      // Extract review IDs to fetch images
      const reviewIds = posts.map((p: any) => p.id);

      // Fetch images
      const { data: imagesData, error: imagesError } = await supabase
        .from('review_images')
        .select('*')
        .in('review_id', reviewIds);

      if (imagesError) console.error("Error fetching review images:", imagesError);

      // Fetch image likes for current user to determine is_liked status for images
      let likedImageIds: Set<string> = new Set();
      if (imagesData && imagesData.length > 0) {
        const imageIds = imagesData.map((img: any) => img.id);
        const { data: likesData } = await supabase
          .from('image_likes')
          .select('image_id')
          .eq('user_id', user.id)
          .in('image_id', imageIds);

        if (likesData) {
          likedImageIds = new Set(likesData.map((l: any) => l.image_id));
        }
      }

      const imagesMap = (imagesData || []).reduce((acc: any, img: any) => {
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

      return posts.map((post: any) => {
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
        } as FeedReview;
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < LIMIT) return undefined;
      return allPages.length * LIMIT;
    },
    enabled: !!user,
    initialPageParam: 0,
  });
}
