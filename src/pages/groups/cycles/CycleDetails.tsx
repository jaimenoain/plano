import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, Archive, PlayCircle, Star, Calendar, Notebook, Pencil } from "lucide-react";
import { CreateCycleDialog } from "@/components/groups/cycles/CreateCycleDialog";
import { AddSessionToCycleDialog } from "@/components/groups/cycles/AddSessionToCycleDialog";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { slugify } from "@/lib/utils";
import { getBuildingImageUrl } from "@/utils/image";

// Reusing types from other files implicitly for now, keeping it simple
interface CycleLeaderboardItem {
  building: {
    id: string;
    name: string;
    main_image_url: string | null;
    year_completed: number | null;
  };
  avg_rating: number;
  count: number;
}

export default function CycleDetails() {
  const { slug, cycleSlug } = useParams();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { group, isAdmin } = useOutletContext<{ group: any, isAdmin: boolean }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showHostNotes, setShowHostNotes] = useState(true);

  // 0. Resolve Cycle ID from Slug
  const { data: cycleId, isLoading: idLoading } = useQuery({
    queryKey: ["cycle-id", group?.id, cycleSlug],
    queryFn: async () => {
       const { data, error } = await supabase
         .from("group_cycles")
         .select("id, title")
         .eq("group_id", group.id);

       if (error) throw error;

       const match = data.find(c => slugify(c.title) === cycleSlug);
       return match ? match.id : null;
    },
    enabled: !!group?.id && !!cycleSlug
  });

  // 1. Fetch Cycle Details
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ["cycle", cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_cycles")
        .select("*")
        .eq("id", cycleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!cycleId
  });

  // 2. Fetch Sessions in this Cycle
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["cycle-sessions", cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_sessions")
        .select(`
          *,
          buildings:session_buildings(
            is_main,
            building:buildings(*)
          )
        `)
        .eq("cycle_id", cycleId)
        .order("session_date", { ascending: true }); // Chronological

      if (error) throw error;
      return data;
    },
    enabled: !!cycleId
  });

  // 3. Calculate Leaderboard (Client-side)
  // We need logs for the buildings in these sessions from group members
  const sessionBuildingIds = useMemo(() => {
    if (!sessions) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return sessions.flatMap((s: any) => s.buildings?.map((f: any) => f.building?.id)).filter(Boolean);
  }, [sessions]);

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["cycle-leaderboard", cycleId, sessionBuildingIds],
    queryFn: async () => {
      if (sessionBuildingIds.length === 0) return [];

      // Get member IDs
      const { data: members } = await supabase.from("group_members").select("user_id").eq("group_id", group.id);
      const memberIds = members?.map(m => m.user_id) || [];
      if (memberIds.length === 0) return [];

      // Fetch logs
      const { data: logs, error } = await supabase
        .from("user_buildings")
        .select("rating, building_id")
        .in("building_id", sessionBuildingIds)
        .in("user_id", memberIds)
        .not("rating", "is", null);

      if (error) throw error;

      // Calculate stats
      const statsMap = new Map<string, { sum: number; count: number }>();

      logs.forEach(log => {
          const bid = String(log.building_id);
          const current = statsMap.get(bid) || { sum: 0, count: 0 };
          statsMap.set(bid, { sum: current.sum + log.rating, count: current.count + 1 });
      });

      // Map back to building details
      const results: CycleLeaderboardItem[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allBuildings = sessions?.flatMap((s: any) => s.buildings?.map((f: any) => f.building)).filter(Boolean) || [];

      // Deduplicate buildings map
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildingMap = new Map<string, any>();
      allBuildings.forEach((b: any) => buildingMap.set(String(b.id), b));

      statsMap.forEach((val, key) => {
          const building = buildingMap.get(key);
          if (building) {
              results.push({
                  building: {
                      id: building.id,
                      name: building.name,
                      main_image_url: building.main_image_url,
                      year_completed: building.year_completed
                  },
                  avg_rating: val.sum / val.count,
                  count: val.count
              });
          }
      });

      return results.sort((a, b) => b.avg_rating - a.avg_rating);
    },
    enabled: !!sessions && sessionBuildingIds.length > 0 && !!group?.id
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!cycle) return;
      const isActive = newStatus === 'active';
      const { error } = await supabase
        .from("group_cycles")
        .update({ status: newStatus, is_active: isActive })
        .eq("id", cycle.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle", cycleId] });
      // Also invalidate list
      queryClient.invalidateQueries({ queryKey: ["group-cycles", group.id] });
      toast({ title: "Cycle status updated" });
    }
  });

  const deleteCycle = useMutation({
    mutationFn: async () => {
       const { error } = await supabase.from("group_cycles").delete().eq("id", cycleId);
       if (error) throw error;
    },
    onSuccess: () => {
       toast({ title: "Cycle deleted" });
       navigate(`/groups/${slug}/cycles`);
    }
  });

  if (idLoading || cycleLoading || sessionsLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
  if (!cycleId || !cycle) return <div className="p-8 text-center">Cycle not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in pb-20">

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center w-full">
            <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground" onClick={() => navigate(`/groups/${slug}/cycles`)}>
               <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cycles
            </Button>

            {isAdmin && (
               <div className="flex items-center gap-2">
                   <AddSessionToCycleDialog
                       groupId={group.id}
                       cycleId={cycleId}
                   />
                   <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                       <Edit className="mr-2 h-4 w-4" /> Edit
                   </Button>

                   {cycle.status === 'draft' && (
                       <Button onClick={() => updateStatus.mutate('active')}>
                           <PlayCircle className="mr-2 h-4 w-4" /> Publish
                       </Button>
                   )}
                   {(cycle.status === 'active' || (cycle.status == null && cycle.is_active)) && (
                       <Button variant="secondary" onClick={() => updateStatus.mutate('archived')}>
                           <Archive className="mr-2 h-4 w-4" /> Archive
                       </Button>
                   )}
                   {(cycle.status === 'archived' || (cycle.status == null && !cycle.is_active)) && (
                       <Button onClick={() => updateStatus.mutate('active')}>
                           <PlayCircle className="mr-2 h-4 w-4" /> Reactivate
                       </Button>
                   )}

                   <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                       if (confirm("Delete this cycle? Sessions will remain but be unlinked.")) deleteCycle.mutate();
                   }}>
                       <Trash2 className="h-4 w-4" />
                   </Button>
               </div>
           )}
        </div>

        <div className="space-y-2">
           <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{cycle.title}</h1>
              {(cycle.status === 'archived' || (cycle.status == null && !cycle.is_active)) && <Badge variant="secondary">Archived</Badge>}
              {cycle.status === 'draft' && <Badge variant="outline" className="border-dashed">Draft</Badge>}
           </div>
           {cycle.description && <p className="text-lg text-muted-foreground">{cycle.description}</p>}
        </div>

        {isAdmin && cycle.host_notes && (
            <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 text-sm">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-yellow-600 flex items-center gap-2">
                        <Notebook className="w-4 h-4" /> Host Notes (Visible to Admins)
                    </h3>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsEditOpen(true)}
                            className="text-yellow-600 hover:text-yellow-700"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
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
                        {cycle.host_notes}
                    </p>
                )}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Column: Sessions List */}
          <div className="lg:col-span-2 space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Schedule
              </h3>

              <div className="space-y-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {sessions?.map((session: any) => {
                      const date = new Date(session.session_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0); // Start of today
                      const sessionDay = new Date(date);
                      sessionDay.setHours(0,0,0,0);

                      const isFuture = sessionDay >= today;
                      const isPast = sessionDay < today;

                      // Sort buildings: Main first
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const sortedBuildings = session.buildings?.slice().sort((a: any, b: any) => {
                          if (a.is_main && !b.is_main) return -1;
                          if (!a.is_main && b.is_main) return 1;
                          return 0;
                      });

                      return (
                        <div
                           key={session.id}
                           className={`flex gap-4 p-4 rounded-xl border cursor-pointer hover:border-primary/50 transition-colors ${isPast ? 'bg-muted/30 opacity-80' : 'bg-primary/5 border-primary/20'}`}
                           onClick={() => navigate(`/groups/${slug}/sessions/${slugify(session.title || "session")}/${session.id}`)}
                        >
                           <div className={`flex flex-col items-center justify-center min-w-[60px] h-full border-r pr-4 ${isFuture ? 'text-primary' : 'text-muted-foreground'}`}>
                               <span className="text-xs font-bold uppercase opacity-70">{date.toLocaleString('default', { month: 'short' })}</span>
                               <span className="text-2xl font-black">{date.getDate()}</span>
                           </div>
                           <div className="flex-1 min-w-0 space-y-3">
                               <div>
                                  <h4 className="font-bold text-lg hover:underline decoration-primary/50 underline-offset-4">{session.title || "Session"}</h4>
                                  {session.description && <p className="text-sm text-muted-foreground line-clamp-2">{session.description}</p>}
                               </div>

                               <div className="grid gap-2">
                                   {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                   {sortedBuildings?.map(({ building, is_main }: any) => (
                                       <div
                                         key={building.id}
                                         className="flex gap-3 items-center group p-1 rounded transition-colors"
                                       >
                                           <img src={getBuildingImageUrl(building.main_image_url)} className="w-10 h-14 object-cover rounded shadow-sm" alt="" />
                                           <div>
                                               <div className="flex items-center gap-2">
                                                   <span className="font-semibold text-sm">{building.name}</span>
                                                   {is_main && <Badge className="text-[10px] h-4 px-1">Main</Badge>}
                                               </div>
                                               <div className="text-xs text-muted-foreground">
                                                   {building.year_completed}
                                               </div>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                        </div>
                      );
                  })}
                  {sessions?.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground italic border border-dashed rounded-xl">
                          No sessions added to this cycle yet.
                      </div>
                  )}
              </div>
          </div>

          {/* Sidebar: Leaderboard */}
          <div className="space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" /> Leaderboard
              </h3>

              {leaderboardLoading ? (
                  <Skeleton className="h-64 w-full" />
              ) : leaderboard && leaderboard.length > 0 ? (
                  <div className="bg-card border rounded-xl overflow-hidden divide-y">
                      {leaderboard.map((item, idx) => (
                          <div
                            key={item.building.id}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/building/${item.building.id}`)}
                          >
                              <div className="font-mono text-muted-foreground font-bold w-6 text-center shrink-0">
                                  #{idx + 1}
                              </div>
                              <img src={getBuildingImageUrl(item.building.main_image_url) || '/placeholder.svg'} className="w-10 h-14 object-cover rounded shrink-0" alt="" />
                              <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold truncate">{item.building.name}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      <span className="flex items-center text-yellow-500 font-bold">
                                          <Star className="w-3 h-3 mr-0.5 fill-current" />
                                          {item.avg_rating.toFixed(1)}
                                      </span>
                                      <span>({item.count} ratings)</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-xl border">
                      Not enough ratings yet to show rankings.
                  </div>
              )}
          </div>

      </div>

      <CreateCycleDialog
        groupId={group.id}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        cycleToEdit={cycle}
        onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["cycle", cycleId] });
            queryClient.invalidateQueries({ queryKey: ["group-cycles", group.id] });
        }}
      />
    </div>
  );
}
