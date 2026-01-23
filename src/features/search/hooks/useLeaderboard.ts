import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LeaderboardData } from "../components/types";

export function useLeaderboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["building-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_building_leaderboards");

      if (error) {
        throw error;
      }

      // Cast the response to our typed interface
      // The RPC returns { most_visited: [], top_rated: [] }
      return data as unknown as LeaderboardData;
    },
  });

  return {
    leaderboard: data,
    isLoading,
    error,
  };
}
