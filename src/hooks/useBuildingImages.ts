import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBuildingImages(buildingId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["building_images", buildingId],
    queryFn: async () => {
      // review_images is linked via user_buildings
      const { data, error } = await supabase
        .from("review_images")
        .select("id, storage_path, user_buildings!inner(building_id)")
        .eq("user_buildings.building_id", buildingId)
        .limit(5);

      if (error) throw error;

      return data;
    },
    enabled: !!buildingId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
