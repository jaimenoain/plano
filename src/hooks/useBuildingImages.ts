import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBuildingImages(buildingId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["building_images", buildingId],
    queryFn: async () => {
      // Based on MergeComparison.tsx, review_images has a building_id column
      const { data, error } = await supabase
        .from("review_images")
        .select("id, storage_path")
        .eq("building_id", buildingId)
        .limit(5);

      if (error) throw error;

      return data;
    },
    enabled: !!buildingId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
