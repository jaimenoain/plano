import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { syncMyMilestones } from "../api/milestones";

/**
 * The caller's milestones (roadmap 3.3), evaluating and awarding them as a side effect.
 *
 * A query rather than a mutation on purpose: `sync_my_ambassador_milestones()` is
 * idempotent, and one shared query key means the layout's award pass and the My impact
 * shelf are a single request — the same cache-sharing trick EmbassyLayout and MyGoals
 * already use for `ambassador-membership`.
 *
 * EmbassyLayout calls this so a badge is awarded (and announced) on any Embassy visit,
 * not only when the ambassador happens to open /embassy/impact — otherwise the
 * notification could only ever reach someone who had already looked.
 */
export function useMilestones() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["embassy-milestones", user?.id],
    queryFn: syncMyMilestones,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
