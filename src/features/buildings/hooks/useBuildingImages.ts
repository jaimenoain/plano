import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBuildingImages(buildingId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["building_images", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_images")
        .select(`
          id,
          storage_path,
          likes_count,
          created_at,
          building_posts!review_images_review_id_fkey!inner(
            building_id,
            user:profiles!building_posts_user_id_fkey(
              id,
              username,
              avatar_url
            )
          )
        `)
        .eq("building_posts.building_id", buildingId)
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data;
    },
    enabled: !!buildingId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
