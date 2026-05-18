import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchAmbassadorMyAuditTimeline, type AmbassadorAuditRow } from "@/features/embassy/api/taskFeed";
import { fetchChapterAmbassadorActivity } from "@/features/embassy/api/leadership";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Target, History, Plus, Loader2, ArrowUpRight, TrendingUp, Medal, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Goal = {
  id: string;
  user_id: string;
  title: string;
  target_value: number;
  current_value: number;
  metric: "edits" | "photos" | "firms_claimed" | "visits";
  status: "active" | "achieved" | "abandoned";
  due_date: string | null;
  created_at: string;
};

export default function MyGoalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGoalOpen, setIsGoalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("10");
  const [metric, setMetric] = useState<Goal["metric"]>("edits");

  // Fetch membership for chapterId (to show leaderboard)
  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select("chapter_id, chapter:ambassador_chapters(name)")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const chapterId = membership?.chapter_id;

  // Fetch personal goals — RPC derives current_value at read time from
  // review_images / building_audit_logs / user_buildings / company_stewards,
  // since the ambassador_goals.current_value column itself is never written.
  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ["ambassador-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_ambassador_goals");
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
    enabled: !!user,
  });

  // Fetch leaderboard
  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ["chapter-leaderboard", chapterId],
    queryFn: () => fetchChapterAmbassadorActivity(chapterId!, 30),
    enabled: !!chapterId,
  });

  // Fetch personal activity timeline
  const { data: timeline, isLoading: loadingTimeline } = useQuery({
    queryKey: ["ambassador-timeline", user?.id],
    queryFn: () => fetchAmbassadorMyAuditTimeline(),
    enabled: !!user,
  });

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ambassador_goals")
        .insert({
          user_id: user!.id,
          title,
          target_value: parseInt(target),
          metric,
          status: "active",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Goal set! Go get 'em.");
      setIsGoalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["ambassador-goals", user?.id] });
    },
    onError: () => {
      toast.error("Failed to set goal. Check if the ambassador_goals table exists.");
    },
  });

  const resetForm = () => {
    setTitle("");
    setTarget("10");
    setMetric("edits");
  };

  return (
    <div className="space-y-12 pb-20">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Goals & Performance</h1>
          <p className="text-muted-foreground">Track your impact and see how you rank in {membership?.chapter?.name}.</p>
        </div>
        <Button onClick={() => setIsGoalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Set a Goal
        </Button>
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* ─── Personal Goals (Left/Main) ─── */}
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-brand-primary" />
              <h2 className="text-xl font-bold">Active Goals</h2>
            </div>

            {loadingGoals ? (
              <div className="grid gap-4">
                {[0, 1].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
              </div>
            ) : goals?.filter(g => g.status === 'active').length === 0 ? (
              <Card className="p-8 text-center border-dashed border-2 flex flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Star className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">No active goals</p>
                  <p className="text-sm text-muted-foreground">Set a target to keep yourself motivated.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsGoalOpen(true)}>Set your first goal</Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {goals?.filter(g => g.status === 'active').map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-brand-primary" />
              <h2 className="text-xl font-bold">Recent Contributions</h2>
            </div>

            {loadingTimeline ? (
              <div className="space-y-3">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : timeline?.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No recent activity logged.</p>
            ) : (
              <div className="space-y-3">
                {timeline?.map((item, i) => (
                  <ActivityRow key={i} item={item} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ─── Chapter Leaderboard (Right) ─── */}
        <div className="space-y-8">
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">Leaderboard</h2>
            </div>

            <Card className="p-1 overflow-hidden border-border-default">
              <div className="bg-surface-muted/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex justify-between">
                <span>Ambassador</span>
                <span>Edits (30d)</span>
              </div>
              <div className="divide-y">
                {loadingLeaderboard ? (
                  [0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full m-1 rounded-md" />)
                ) : leaderboard?.slice(0, 10).map((member, i) => (
                  <LeaderboardRow 
                    key={member.user_id} 
                    member={member} 
                    rank={i + 1} 
                    isCurrentUser={member.user_id === user?.id} 
                  />
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>

      <Dialog open={isGoalOpen} onOpenChange={(open) => { setIsGoalOpen(open); if(!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set a Personal Goal</DialogTitle>
            <DialogDescription>
              Quantitative targets to focus your efforts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">What's the goal?</Label>
              <Input 
                id="goal-title" 
                placeholder="e.g. Audit all high-rises in the City" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edits">Edits</SelectItem>
                    <SelectItem value="photos">Photos</SelectItem>
                    <SelectItem value="visits">Visits</SelectItem>
                    <SelectItem value="firms_claimed">Firm Claims</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-target">Target</Label>
                <Input 
                  id="goal-target" 
                  type="number" 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createGoalMutation.mutate()} 
              disabled={createGoalMutation.isPending || !title.trim()}
            >
              {createGoalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const progress = Math.min(100, (goal.current_value / goal.target_value) * 100);
  
  const metricLabels = {
    edits: "edits",
    photos: "photos",
    firms_claimed: "firms claimed",
    visits: "visits logged"
  };

  return (
    <Card className="p-6 space-y-4 hover:border-brand-primary transition-all">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-bold text-lg">{goal.title}</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            {goal.current_value} / {goal.target_value} {metricLabels[goal.metric]}
          </p>
        </div>
        <div className="h-10 w-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
          <span>{Math.round(progress)}% COMPLETE</span>
          <span>STARTED {formatDistanceToNow(new Date(goal.created_at), { addSuffix: true }).toUpperCase()}</span>
        </div>
      </div>
    </Card>
  );
}

function ActivityRow({ item }: { item: AmbassadorAuditRow }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-surface-muted/50 transition-colors">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <History className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          <span className="text-brand-primary font-bold">{item.operation.toUpperCase()}</span> · {item.building_name}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ""}
        </p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function LeaderboardRow({ member, rank, isCurrentUser }: { 
  member: any; 
  rank: number; 
  isCurrentUser: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 transition-colors",
      isCurrentUser ? "bg-brand-primary/5" : "hover:bg-surface-muted/30"
    )}>
      <div className="w-6 text-center font-bold text-xs text-muted-foreground">
        {rank === 1 ? <Medal className="h-4 w-4 text-amber-500 mx-auto" /> : 
         rank === 2 ? <Medal className="h-4 w-4 text-slate-400 mx-auto" /> :
         rank === 3 ? <Medal className="h-4 w-4 text-amber-700 mx-auto" /> : rank}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={member.avatar_url} />
        <AvatarFallback className="text-[10px] font-bold">
          {member.username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold truncate", isCurrentUser && "text-brand-primary")}>
          @{member.username}
          {isCurrentUser && <span className="ml-2 text-[10px] font-normal text-muted-foreground">(You)</span>}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
          {member.role}
        </p>
      </div>
      <div className="text-right tabular-nums">
        <p className="font-bold text-sm">{member.edits_count}</p>
      </div>
    </div>
  );
}
