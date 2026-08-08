/**
 * Pre-aggregated snapshot of the member's library for the feed rail's
 * "My Map" module — see `get_my_map_summary` and `fetchMyMapSummary`.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchMyMapSummary } from "../api/railApi";

export function useMyMapSummary(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-map-summary", userId],
    queryFn: fetchMyMapSummary,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
