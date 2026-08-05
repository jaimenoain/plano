import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import {
  fetchBuildingActivity,
  BUILDING_ACTIVITY_LIMIT,
  type BuildingActivity,
} from "../api/buildingActivity";

const EMPTY: BuildingActivity = {
  visited: [],
  saved: [],
  totalVisited: 0,
  totalSaved: 0,
};

/**
 * Members who saved or visited a building, for the detail page Overview tab.
 *
 * The RPC behind {@link fetchBuildingActivity} is granted to `authenticated`
 * only, so the query stays disabled for logged-out visitors and the section
 * renders nothing rather than erroring.
 */
export function useBuildingActivity(buildingId: string | undefined) {
  const { user } = useAuth();

  return useQuery<BuildingActivity>({
    queryKey: ["building-activity", buildingId],
    enabled: !!buildingId && !!user,
    staleTime: 2 * 60 * 1000,
    queryFn: () => fetchBuildingActivity(buildingId!, BUILDING_ACTIVITY_LIMIT),
    placeholderData: EMPTY,
  });
}
