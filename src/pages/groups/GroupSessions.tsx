import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useInfiniteQuery, useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { MetaHead } from "@/components/common/MetaHead";
import { SessionCard } from "@/components/groups/SessionCard";
import { CalendarPlus, Calendar } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { PollDialog } from "@/components/groups/polls/PollDialog";
import { useToast } from "@/hooks/use-toast";
import { JoinGroupDialog } from "@/components/groups/JoinGroupDialog";

const SESSIONS_PER_PAGE = 5;

export default function GroupSessions() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { group, isAdmin, isMember } = useOutletContext<{ group: any, isAdmin: boolean, isMember: boolean }>();
  
  const [sessionFilter, setSessionFilter] = useState<"upcoming" | "past" | "drafts">("upcoming");
  const [showGroupStats, setShowGroupStats] = useState(false);

  // Check for initial tab selection
  useEffect(() => {
    const checkInitialTab = async () => {
      // Only run this check once when we have a group ID
      if (!group?.id) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const filterDate = format(today, "yyyy-MM-dd");

      // Check upcoming
      const { count: upcomingCount } = await supabase
        .from("group_sessions")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id)
        .or("status.neq.draft,status.is.null")
        .gte("session_date", filterDate);

      // If no upcoming sessions, check if there are past sessions
      if (upcomingCount === 0) {
        // Check past
        const { count: pastCount } = await supabase
          .from("group_sessions")
          .select("id", { count: "exact", head: true })
          .eq("group_id", group.id)
           .or("status.neq.draft,status.is.null")
          .lt("session_date", filterDate);

        if (pastCount && pastCount > 0) {
          setSessionFilter("past");
        }
      }
    };

    checkInitialTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  // --- NEW: Self-Healing Stats Mechanism ---
  // If stats are missing, this mutation calls the DB function to generate them
  const forceUpdateStats = useMutation({
    mutationFn: async () => {
      if (!group?.id) return;
      const { error } = await supabase.rpc('update_group_stats', { target_group_id: group.id });
      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh the group data in the parent layout to show the new stats
      queryClient.invalidateQueries({ queryKey: ["group-basic"] });
    }
  });

  // Check on mount: if stats are missing/empty, trigger the calculation
  useEffect(() => {
    const hasStats = group?.stats_cache?.ranking_data && Array.isArray(group.stats_cache.ranking_data);
    if (group?.id && !hasStats) {
      console.log("Stats cache missing, forcing update...");
      forceUpdateStats.mutate();
    }
  }, [group?.id, group?.stats_cache]);
  // -----------------------------------------

  // 1. Fetch Sessions
  const { 
    data: sessionPages, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading 
  } = useInfiniteQuery({
    queryKey: ["group-sessions", group?.id, sessionFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const filterDate = format(today, "yyyy-MM-dd");
      
      // Fetch from session_buildings (new schema)
      let query = supabase
        .from("group_sessions")
        .select(`
          *, 
          buildings:session_buildings(building_id, is_main, building:buildings(id, name, main_image_url, year_completed)),
          likes:session_likes(user_id, user:profiles(id, username, avatar_url)),
          comments_list:session_comments(id, content, created_at, user:profiles(id, username, avatar_url)),
          comments:session_comments(count),
          cycle:group_cycles(id, title),
          polls:polls(id, status, title, type, slug, description, questions:poll_questions(id, is_live_active), poll_votes(user_id))
        `)
        .eq("group_id", group.id);

      if (sessionFilter === "drafts") {
        query = query.eq("status", "draft").order("session_date", { ascending: false });
      } else if (sessionFilter === "upcoming") {
        query = query
          .or("status.neq.draft,status.is.null") // Exclude drafts but include nulls (legacy)
          .gte("session_date", filterDate)
          .order("session_date", { ascending: true });
      } else {
        query = query
          .or("status.neq.draft,status.is.null") // Exclude drafts but include nulls (legacy)
          .lt("session_date", filterDate)
          .order("session_date", { ascending: false });
      }

      const { data, error } = await query.range(pageParam, pageParam + SESSIONS_PER_PAGE - 1);
      if (error) throw error;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((session: any) => ({
        ...session,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buildings: session.buildings?.map((b: any) => ({
          ...b,
          building: {
            ...b.building,
            year_completed: b.building.year_completed,
            architects: []
          }
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        is_liked: session.likes?.some((l: any) => l.user_id === user?.id),
        likes_count: session.likes?.length || 0,
        comments_count: session.comments?.[0]?.count || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comments_data: (session.comments_list || []).sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
        likes_data: session.likes || []
      }));
    },
    getNextPageParam: (lastPage, allPages) => 
      lastPage.length === SESSIONS_PER_PAGE ? allPages.length * SESSIONS_PER_PAGE : undefined,
    enabled: !!group?.id,
  });

  const sessions = useMemo(() => sessionPages?.pages.flat() || [], [sessionPages]);
  
  // 2. Identify Visible Buildings
  const visibleBuildingIds = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = sessions.flatMap((s: any) => s.buildings?.map((f: any) => f.building_id) || []);
    return Array.from(new Set(ids));
  }, [sessions]);

  // 3. Fetch ONLY the logs needed for the currently visible cards
  const { data: visibleLogs } = useQuery({
    queryKey: ["group-logs-visible", group?.id, user?.id, visibleBuildingIds],
    queryFn: async () => {
      if (visibleBuildingIds.length === 0) return [];

      const { data: members } = await supabase.from("group_members").select("user_id").eq("group_id", group.id);
      const memberIds = members?.map(m => m.user_id) || [];
      if (user?.id && !memberIds.includes(user.id)) memberIds.push(user.id);
      if (memberIds.length === 0) return [];

      // Use user_buildings table
      const { data, error } = await supabase
        .from("user_buildings")
        .select("building_id, rating, status, content, tags, user:profiles(id, username, avatar_url)")
        .in("user_id", memberIds)
        .in("building_id", visibleBuildingIds)
        .not("rating", "is", null);

      if (error) throw error;
      return data;
    },
    enabled: !!group?.id && visibleBuildingIds.length > 0,
    placeholderData: (prev) => prev
  });

  // 4. Use the CACHED data for the Sparkline (Global Stats)
  const globalRankingData = useMemo(() => {
    const cached = group?.stats_cache?.ranking_data;
    if (cached && Array.isArray(cached)) {
      return cached;
    }
    return [];
  }, [group]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <MetaHead
        title={group?.name}
        description={group?.description || `Join events in ${group?.name}`}
      />
      
      {isAdmin && (
        <div className="flex justify-end px-2">
          <Button onClick={() => navigate(`/groups/${slug}/session/create`)} size="sm" className="w-full sm:w-auto">
            <CalendarPlus className="mr-2 h-4 w-4" /> Plan Event
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4">
        <div className="flex bg-background p-1 rounded-lg border shadow-sm">
          <Button 
            variant={sessionFilter === "upcoming" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setSessionFilter("upcoming")}
            className="w-24 transition-all"
          >
            Upcoming
          </Button>
          <Button 
            variant={sessionFilter === "past" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setSessionFilter("past")}
            className="w-24 transition-all"
          >
            Past
          </Button>
          {isMember && (
            <Button
              variant={sessionFilter === "drafts" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSessionFilter("drafts")}
              className="w-24 transition-all"
            >
              Drafts
            </Button>
          )}
        </div>
        
         <div className="flex items-center space-x-2">
            <Switch
              id="show-stats"
              checked={showGroupStats}
              onCheckedChange={(checked) => {
                if (!isMember && checked) {
                  toast({
                    title: "Members Only",
                    description: "You must be a member to see group stats.",
                  });
                  setShowJoinDialog(true);
                  return;
                }
                setShowGroupStats(checked);
              }}
            />
            <Label htmlFor="show-stats" className="text-sm font-medium text-muted-foreground">Show Group Stats</Label>
         </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-4 bg-card border rounded-xl p-4">
                <Skeleton className="h-24 w-full sm:w-32 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 bg-muted/10 rounded-xl border border-dashed">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium text-lg">No events found</h3>
            <p className="text-muted-foreground">There are no {sessionFilter} events scheduled.</p>
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sessions.map((session: any) => (
              <SessionCard
                key={session.id}
                session={session}
                group={group}
                user={user}
                isAdmin={isAdmin}
                slug={slug || ""}
                visibleLogs={visibleLogs || []}
                globalRankingData={globalRankingData}
                showGroupStats={showGroupStats}
                onUpdateStats={() => forceUpdateStats.mutate()}
                poll={session.polls?.[0]}
              />
            ))}
            {hasNextPage && (
              <div className="pt-4 flex justify-center">
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Loading..." : "Load previous events"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <PollDialog
        pollId={selectedPollId}
        open={!!selectedPollId}
        onOpenChange={(open) => !open && setSelectedPollId(null)}
      />

      <JoinGroupDialog
        group={group}
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
      />
    </div>
  );
}
