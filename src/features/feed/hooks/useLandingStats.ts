import { useQuery } from "@tanstack/react-query";
import { getLandingStats } from "../api/landingStatsApi";

export const landingStatsKeys = {
  all: ["landing", "stats"] as const,
};

export function useLandingStats() {
  return useQuery({
    queryKey: landingStatsKeys.all,
    queryFn: getLandingStats,
    staleTime: 1000 * 60 * 10,
  });
}
