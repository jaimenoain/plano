import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBuildingImages(buildingId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["building_images", buildingId],
    queryFn: async () => {
      // review_images is linked via user_buildings
      const { data, error } = await supabase
        .from("review_images")
        .select(`
          id,
          storage_path,
          likes_count,
          created_at,
          user_buildings!review_images_review_id_fkey!inner(
            building_id,
            user:profiles(
              id,
              username,
              avatar_url,
              first_name,
              last_name
            )
          )
        `)
        .eq("user_buildings.building_id", buildingId)
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
