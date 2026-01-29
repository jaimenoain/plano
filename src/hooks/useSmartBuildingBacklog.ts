import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SmartBuilding } from "@/components/groups/watchlist/SmartBuildingCard";
import { FilterState } from "@/components/groups/watchlist/SmartBacklogFilters";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSmartBacklog(group: any, selectedMemberIds: string[], filters: FilterState) {
  return useQuery({
    queryKey: ["group-smart-backlog", group?.id, selectedMemberIds, filters],
    queryFn: async () => {
      if (selectedMemberIds.length === 0) return [];

      // 1. Fetch relevant logs (pending and visited/logged) for selected members
      const { data: logs, error: logsError } = await supabase
        .from("user_buildings")
        .select(`
          building_id,
          user_id,
          status,
          rating,
          visited_at
        `)
        .in("user_id", selectedMemberIds)
        .in("status", ["pending", "visited"]);

      if (logsError) throw logsError;

      // 2. Process logs
      const bucketListMap = new Map<string, Set<string>>(); // building_id -> Set<user_id>
      const seenSet = new Set<string>(); // building_id (if seen/visited by ANY selected member)

      logs.forEach((log) => {
        const isSeen = log.status === "visited" || log.rating !== null || log.visited_at !== null;

        if (isSeen) {
           seenSet.add(log.building_id);
        } else if (log.status === "pending") {
           if (!bucketListMap.has(log.building_id)) {
             bucketListMap.set(log.building_id, new Set());
           }
           bucketListMap.get(log.building_id)?.add(log.user_id);
        }
      });

      // 3. Filter IDs
      let candidateBuildingIds = Array.from(bucketListMap.keys());

      // Filter: Exclude Seen (Visited)
      if (filters.excludeSeen) {
        candidateBuildingIds = candidateBuildingIds.filter((id) => !seenSet.has(id));
      }

      if (candidateBuildingIds.length === 0) return [];

      // 3.5 Check Pipeline Status
      const { data: pipelineItems, error: pipelineError } = await supabase
        .from("group_backlog_items")
        .select("building_id")
        .eq("group_id", group.id);

      if (pipelineError) throw pipelineError;

      const pipelineSet = new Set(pipelineItems?.map(i => i.building_id));

      // 4. Fetch Building Details for candidates
      // @ts-ignore
      const { data: buildingDetails, error: buildingsError } = await supabase
        .from("buildings")
        .select("*, main_image_url, architects:building_architects(architect:architects(name, id))")
        .in("id", candidateBuildingIds);

      if (buildingsError) throw buildingsError;

      // 5. Final Aggregation
      const results: SmartBuilding[] = buildingDetails
        .map((building) => {
          const interestedUserIds = Array.from(bucketListMap.get(building.id) || []);

          const interestedUsers = group.members
            .filter((m: any) => interestedUserIds.includes(m.user.id))
            .map((m: any) => ({
              id: m.user.id,
              username: m.user.username,
              avatar_url: m.user.avatar_url
            }));

          return {
            id: building.id,
            name: building.name,
            main_image_url: building.main_image_url,
            year_completed: building.year_completed,
            // @ts-ignore
            architects: building.architects?.map((a: any) => a.architect).filter(Boolean) || [],
            overlap_count: interestedUserIds.length,
            interested_users: interestedUsers,
            total_selected_members: selectedMemberIds.length,
            is_in_pipeline: pipelineSet.has(building.id),
          };
        });

      // 6. Sort
      // Primary: Overlap Count (Desc)
      // Secondary: Year (Desc)
      return results.sort((a, b) => {
        if (b.overlap_count !== a.overlap_count) {
          return b.overlap_count - a.overlap_count;
        }
        return (b.year_completed || 0) - (a.year_completed || 0);
      });
    },
    enabled: !!group?.id,
  });
}
