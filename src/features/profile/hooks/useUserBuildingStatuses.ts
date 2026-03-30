import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";

export type BuildingStatus = "pending" | "visited" | "ignored";

interface UserBuildingStatusRow {
  building_id: string;
  status: string;
  rating: number | null;
}

export function useUserBuildingStatuses() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["user-building-statuses", user?.id],
    queryFn: async () => {
      if (!user) return { statuses: {}, ratings: {} };
      const { data: rows, error } = await supabase
        .from("user_buildings")
        .select("building_id, status, rating")
        .eq("user_id", user.id);

      if (error) {
        return { statuses: {}, ratings: {} };
      }

      const statusMap: Record<string, BuildingStatus> = {};
      const ratingMap: Record<string, number> = {};

      const list = (rows ?? []) as UserBuildingStatusRow[];
      list.forEach((item) => {
        statusMap[item.building_id] = item.status as BuildingStatus;
        if (item.rating !== null) {
          ratingMap[item.building_id] = item.rating;
        }
      });
      return { statuses: statusMap, ratings: ratingMap };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    statuses: data?.statuses || {},
    ratings: data?.ratings || {}
  };
}
