import { useOutletContext } from "react-router-dom";
import { GroupStats } from "@/components/groups/GroupStats";
import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { JoinGroupPrompt } from "@/components/groups/JoinGroupPrompt";

export default function GroupStatsView() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { group, isMember } = useOutletContext<{ group: any; isMember: boolean }>();
  const queryClient = useQueryClient();
  const lastAttemptRef = useRef<number>(0);

  // Mutation to update stats via RPC
  const updateStats = useMutation({
    mutationFn: async () => {
      if (!group?.id) return;
      const { error } = await supabase.rpc('update_group_stats', { target_group_id: group.id });
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate group data to fetch the new stats
      queryClient.invalidateQueries({ queryKey: ["group-basic"] });
    },
    onError: (err) => {
      console.error("Failed to update group stats:", err);
    }
  });

  useEffect(() => {
    // If no stats cache, or if it's stale (> 1 hour), trigger update
    if (!group?.id) return;

    const stats = group.stats_cache;
    // Check both updated_at and last_updated
    const updateTimeStr = stats?.updated_at || stats?.last_updated;
    const lastUpdate = updateTimeStr ? new Date(updateTimeStr) : null;
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    const cooldown = 10000; // 10 seconds cooldown between retry attempts if logic fails

    const isMissing = !stats || (!stats.global && !stats.session);
    const isStale = lastUpdate && (now.getTime() - lastUpdate.getTime() > oneHour);
    const timeSinceLastAttempt = now.getTime() - lastAttemptRef.current;

    if ((isMissing || isStale) && !updateStats.isPending && timeSinceLastAttempt > cooldown) {
      console.log("Stats missing or stale, refreshing...", { isMissing, isStale });
      lastAttemptRef.current = now.getTime();
      updateStats.mutate();
    }
  }, [group?.id, group?.stats_cache]);

  if (!isMember) {
    return <JoinGroupPrompt group={group} />;
  }

  return (
    <div className="relative">
      {updateStats.isPending && (
          <div className="absolute top-2 right-2 text-xs text-muted-foreground animate-pulse z-20 bg-background/80 px-2 py-1 rounded">
              Updating stats...
          </div>
      )}
      <GroupStats
        cachedStats={group?.stats_cache}
        members={group.members || []}
      />
    </div>
  );
}
