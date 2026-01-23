import { useOutletContext, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Archive, FolderOpen, Calendar, File as FileDashed } from "lucide-react";
import { CreateCycleDialog } from "@/components/groups/cycles/CreateCycleDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { slugify } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function GroupCycles() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { group, isAdmin } = useOutletContext<{ group: any, isAdmin: boolean }>();
  const { user } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isMember = useMemo(() => group?.members?.some((m: any) => m.user.id === user?.id && m.status === 'active'), [group, user]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: cycles, isLoading } = useQuery({
    queryKey: ["group-cycles", group?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_cycles")
        .select(`
          *,
          sessions:group_sessions(session_date)
        `)
        .eq("group_id", group.id);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((c: any) => {
        const sessions = c.sessions || [];
        const dates = sessions
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((s: any) => new Date(s.session_date))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime());

        const nextSession = dates.find((d: Date) => d >= today);
        // Find last session (reverse iteration or findLast if available, but filter is safer for compatibility)
        const pastSessions = dates.filter((d: Date) => d < today);
        const lastSession = pastSessions.length > 0 ? pastSessions[pastSessions.length - 1] : null;

        return {
          ...c,
          session_count: sessions.length,
          nextSession,
          lastSession
        };
      });
    },
    enabled: !!group?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
           <Skeleton className="h-32" />
           <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortCycles = (a: any, b: any) => {
      // 1. Closest upcoming session (earliest date first)
      if (a.nextSession && b.nextSession) {
          return a.nextSession.getTime() - b.nextSession.getTime();
      }
      // If one has upcoming and other doesn't, upcoming wins
      if (a.nextSession) return -1;
      if (b.nextSession) return 1;

      // 2. Closest past session (most recent date first)
      if (a.lastSession && b.lastSession) {
          return b.lastSession.getTime() - a.lastSession.getTime();
      }
      // If one has past and other doesn't (no sessions at all), past wins
      if (a.lastSession) return -1;
      if (b.lastSession) return 1;

      // 3. Fallback to creation date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const draftCycles = cycles?.filter(c => c.status === 'draft').sort(sortCycles) || [];
  // Active: status is active OR (status is null and is_active is true)
  const activeCycles = cycles?.filter(c => c.status === 'active' || (c.status == null && c.is_active)).sort(sortCycles) || [];
  // Past: status is archived OR (status is null and is_active is false, but excluding drafts just in case)
  // If status is null, we assume if !is_active it's archived (legacy behavior)
  const pastCycles = cycles?.filter(c => c.status === 'archived' || (c.status == null && !c.is_active)).sort(sortCycles) || [];

  const hasCycles = cycles && cycles.length > 0;

  if (!hasCycles && !isAdmin) {
      return <div className="p-8 text-center text-muted-foreground">No cycles have been created yet.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold">Cycles</h2>
           <p className="text-muted-foreground">Themed collections of sessions.</p>
        </div>
        {isAdmin && (
           <Button onClick={() => setIsCreateOpen(true)}>
             <Plus className="mr-2 h-4 w-4" /> Create Cycle
           </Button>
        )}
      </div>

      {!hasCycles && isAdmin && (
          <div className="text-center py-12 border border-dashed rounded-xl bg-muted/10">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium">Start your first Cycle</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  Cycles are a way to group field trips together under a theme, like "Modernist Month" or "Gothic Revival".
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>Create Cycle</Button>
          </div>
      )}

      {activeCycles.length > 0 && (
          <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> {activeCycles.length === 1 ? 'Active cycle' : 'Active Cycles'}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeCycles.map(cycle => (
                      <CycleCard key={cycle.id} cycle={cycle} groupSlug={group.slug || group.id} />
                  ))}
              </div>
          </div>
      )}

      {isAdmin && draftCycles.length > 0 && (
          <div className="space-y-4 pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileDashed className="w-4 h-4" /> Draft Cycles
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {draftCycles.map(cycle => (
                      <CycleCard key={cycle.id} cycle={cycle} groupSlug={group.slug || group.id} isDraft />
                  ))}
              </div>
          </div>
      )}

      {pastCycles.length > 0 && (
          <div className="space-y-4 pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Archive className="w-4 h-4" /> Past Cycles
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pastCycles.map(cycle => (
                      <CycleCard key={cycle.id} cycle={cycle} groupSlug={group.slug || group.id} />
                  ))}
              </div>
          </div>
      )}

      <CreateCycleDialog
        groupId={group.id}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["group-cycles", group.id] })}
      />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CycleCard({ cycle, groupSlug, isDraft }: { cycle: any, groupSlug: string, isDraft?: boolean }) {
    const navigate = useNavigate();
    const nextSession = cycle.nextSession;

    // Calculate date range string
    const dateRangeString = useMemo(() => {
        if (!cycle.sessions || cycle.sessions.length === 0) return null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dates = cycle.sessions.map((s: any) => new Date(s.session_date)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
        if (dates.length === 0) return null;

        const minDate = dates[0];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Compare date only
        const compareDate = new Date(minDate);
        compareDate.setHours(0, 0, 0, 0);

        const isPast = compareDate < today;
        const isCurrentYear = minDate.getFullYear() === today.getFullYear();

        if (isPast) {
            if (isCurrentYear) {
                return `Since ${minDate.toLocaleString('default', { month: 'long' })}`;
            } else {
                return `Since ${minDate.toLocaleString('default', { month: 'short' })} ${minDate.getFullYear()}`;
            }
        } else {
            // Future or Today
            if (isCurrentYear) {
                 return `Starting in ${minDate.toLocaleString('default', { month: 'long' })}`;
            } else {
                 return `Starting ${minDate.toLocaleString('default', { month: 'short' })} ${minDate.getFullYear()}`;
            }
        }
    }, [cycle.sessions]);

    return (
        <Card
            className={`hover:border-primary/50 transition-colors cursor-pointer group flex flex-col h-full ${isDraft ? 'border-dashed bg-muted/20' : ''}`}
            onClick={() => navigate(`/groups/${groupSlug}/cycles/${slugify(cycle.title)}`)}
        >
            <CardHeader className="flex-1">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors leading-tight">
                            {cycle.title}
                        </CardTitle>
                        {isDraft && <Badge variant="outline" className="w-fit text-[10px] h-5 border-dashed shrink-0">Draft</Badge>}
                    </div>

                    <div className="flex items-center gap-3">
                        {dateRangeString && (
                             <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                 <Calendar className="w-3 h-3" />
                                 {dateRangeString}
                             </span>
                        )}
                        <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-2">
                            {cycle.session_count} {cycle.session_count === 1 ? 'Trip' : 'Trips'}
                        </Badge>
                    </div>
                </div>
                {cycle.description && (
                    <CardDescription className="line-clamp-2 mt-2">{cycle.description}</CardDescription>
                )}
            </CardHeader>
            {nextSession && (
                <div className="px-6 pb-6 pt-0">
                    <div className="text-xs font-semibold text-primary flex items-center gap-2 bg-primary/5 p-2 rounded-md w-fit">
                        <Calendar className="w-3.5 h-3.5" />
                        Next trip: {nextSession.toLocaleDateString('default', { day: 'numeric', month: 'long' })}
                    </div>
                </div>
            )}
        </Card>
    )
}
