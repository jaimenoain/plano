import { useParams, Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Notebook, Pencil, BarChart2 } from "lucide-react";
import { SessionCard } from "@/components/groups/SessionCard";
import { PollCard } from "@/components/groups/polls/PollCard";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SessionDetails() {
  const { slug, sessionId } = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = useOutletContext<{ group: any, isAdmin: boolean }>();
  const group = context?.group;
  const isAdmin = context?.isAdmin;
  const { user } = useAuth();

  const [showGroupStats, setShowGroupStats] = useState(false);
  const [showHostNotes, setShowHostNotes] = useState(true);

  const { data: session, isLoading } = useQuery({
    queryKey: ["session-details", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_sessions')
        .select(`
          *,
          films:session_films(
            film_id,
            is_main,
            film:films(*)
          ),
          likes:session_likes(user_id, user:profiles(id, username, avatar_url)),
          comments_list:session_comments(id, content, created_at, user:profiles(id, username, avatar_url)),
          comments:session_comments(count),
          cycle:group_cycles(id, title)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      // Transform data to match SessionCard expectations

      return {
        ...data,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        is_liked: data.likes?.some((l: any) => l.user_id === user?.id),
        likes_count: data.likes?.length || 0,
        comments_count: data.comments?.[0]?.count || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comments_data: (data.comments_list || []).sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
        likes_data: data.likes || []
      };
    },
    enabled: !!sessionId
  });

  const { data: linkedPoll } = useQuery({
    queryKey: ["session-poll", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polls')
        .select(`
            *,
            questions:poll_questions(
                id,
                is_live_active
            ),
            votes:poll_votes(user_id)
        `)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId
  });

  const visibleFilmIds = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return session?.films?.map((f: any) => f.film_id) || [];
  }, [session]);

  const { data: visibleLogs } = useQuery({
    queryKey: ["group-logs-visible", group?.id, user?.id, visibleFilmIds],
    queryFn: async () => {
      if (!group?.id || visibleFilmIds.length === 0) return [];

      const { data: members } = await supabase.from("group_members").select("user_id").eq("group_id", group.id);
      const memberIds = members?.map(m => m.user_id) || [];
      if (user?.id && !memberIds.includes(user.id)) memberIds.push(user.id);
      if (memberIds.length === 0) return [];

      const { data, error } = await supabase
        .from("log")
        .select("film_id, rating, content, tags, user:profiles(id, username, avatar_url)")
        .in("user_id", memberIds)
        .in("film_id", visibleFilmIds)
        .not("rating", "is", null);

      if (error) throw error;
      return data;
    },
    enabled: !!group?.id && visibleFilmIds.length > 0
  });

  const globalRankingData = useMemo(() => {
    const cached = group?.stats_cache?.ranking_data;
    if (cached && Array.isArray(cached)) {
      return cached;
    }
    return [];
  }, [group]);

  if (isLoading) {
    return (
       <div className="space-y-6">
           <Skeleton className="h-10 w-32" />
           <Skeleton className="h-48 w-full rounded-xl" />
           <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
           </div>
       </div>
    );
  }

  if (!session) return <div>Session not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in pb-10">
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground" asChild>
                    <Link to={`/groups/${slug}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sessions
                    </Link>
                </Button>

                <div className="flex items-center space-x-2">
                    <Switch id="show-stats" checked={showGroupStats} onCheckedChange={setShowGroupStats} />
                    <Label htmlFor="show-stats" className="text-sm font-medium text-muted-foreground">Show Group Stats</Label>
                </div>
            </div>

            {/* MOVED: Poll is now at the top of the content */}
            {linkedPoll && (
                <div className="rounded-xl border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
                    <div className="p-4 border-b border-primary/10 flex items-center justify-between bg-primary/5">
                        <div className="flex items-center gap-2">
                             <div className="p-2 bg-primary/10 rounded-full">
                                <BarChart2 className="w-5 h-5 text-primary" />
                             </div>
                             <div>
                                 <h3 className="font-semibold text-primary/90">Session Poll</h3>
                                 <p className="text-xs text-muted-foreground">Cast your vote or check the results</p>
                             </div>
                        </div>
                    </div>
                    <div className="p-4 bg-background/50">
                        <PollCard
                            poll={linkedPoll}
                            groupSlug={slug || ""}
                            isAdmin={isAdmin}
                        />
                    </div>
                </div>
            )}

            {isAdmin && session.host_notes && (
                <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 text-sm">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-yellow-600 flex items-center gap-2">
                            <Notebook className="w-4 h-4" /> Host Notes (Visible to Admins)
                        </h3>
                        <div className="flex items-center gap-3">
                            <Link to={`/groups/${slug}/session/${session.id}/edit`} className="text-yellow-600 hover:text-yellow-700">
                                <Pencil className="w-3.5 h-3.5" />
                            </Link>
                            <button
                                onClick={() => setShowHostNotes(!showHostNotes)}
                                className="text-xs text-yellow-600 hover:text-yellow-700 underline"
                            >
                                {showHostNotes ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                    {showHostNotes && (
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {session.host_notes}
                        </p>
                    )}
                </div>
            )}

            <SessionCard
              session={session}
              group={group}
              user={user}
              isAdmin={isAdmin}
              slug={slug || ""}
              visibleLogs={visibleLogs || []}
              globalRankingData={globalRankingData}
              showGroupStats={showGroupStats}
              showHostNotesIcon={false}
            />
        </div>
    </div>
  );
}
