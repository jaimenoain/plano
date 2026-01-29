import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type BuildingStatus = 'pending' | 'visited';

export function useUserBuildingStatuses() {
  const { user } = useAuth();

  const { data: statuses = {} } = useQuery({
    queryKey: ["user-building-statuses", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data, error } = await supabase
        .from("user_buildings")
        .select("building_id, status")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user building statuses:", error);
        return {};
      }

      const statusMap: Record<string, BuildingStatus> = {};
      data.forEach((item: any) => {
        statusMap[item.building_id] = item.status;
      });
      return statusMap;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { statuses };
}
