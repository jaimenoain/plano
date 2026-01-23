import { useQuery } from "@tanstack/react-query";
import { getBuildingLeaderboardsRpc } from "@/utils/supabaseFallback";

export function useLeaderboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["building-leaderboard"],
    queryFn: async () => {
      return await getBuildingLeaderboardsRpc();
    },
  });

  return {
    leaderboard: data,
    isLoading,
    error,
  };
}
