import { useState } from "react";
import { Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchAmbassadorMyAuditTimeline, type AmbassadorAuditRow } from "@/features/embassy/api/taskFeed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, History, Plus, Loader2, ArrowUpRight, TrendingUp, CheckSquare, Circle, Clock, CheckCircle2, CalendarDays, FolderOpen, Building2, Eye, EyeOff, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isPast, isToday, parseISO } from "date-fns";
import {
  EmbassyPageHeader,
  EmbassyEmptyState,
  EMBASSY_SKELETON_ROUNDED,
} from "@/features/embassy/components/embassy-ui";

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

type TaskStatus = "todo" | "in_progress" | "done";

interface ChapterTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  visibility: "chapter" | "leadership" | "only_me";
  status: TaskStatus;
  created_by: string;
  creator_username: string | null;
  assigned_to: string | null;
  assignee_username: string | null;
  assignee_avatar_url: string | null;
  project_id: string | null;
  project_title: string | null;
  company_id: string | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; class: string }> = {
  todo:        { label: "To do",       icon: <Circle className="h-3.5 w-3.5" />,        class: "text-muted-foreground" },
  in_progress: { label: "In progress", icon: <Clock className="h-3.5 w-3.5" />,         class: "text-feedback-warning" },
  done:        { label: "Done",        icon: <CheckCircle2 className="h-3.5 w-3.5" />,  class: "text-feedback-success" },
};

const VISIBILITY_CONFIG: Record<"chapter" | "leadership" | "only_me", { label: string; icon: React.ReactNode }> = {
  chapter:    { label: "Everyone",   icon: <Users className="h-3 w-3" /> },
  leadership: { label: "Leadership", icon: <Eye className="h-3 w-3" /> },
  only_me:    { label: "Only me",    icon: <EyeOff className="h-3 w-3" /> },
};

function openTaskDueDateClass(due: string | null): string {
  if (!due) return "";
  const d = parseISO(due);
  if (isPast(d) && !isToday(d)) return "text-destructive";
  if (isToday(d)) return "text-feedback-warning";
  return "text-muted-foreground";
}

function initials(username: string) {
  return username
    .split(/[\s_-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export default function MyGoalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ChapterTask | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("10");
  const [metric, setMetric] = useState<Goal["metric"]>("edits");

  // Reuse the membership query already fired by EmbassyLayout (same queryKey).
  // When this component mounts the cache is already populated, so chapterId
  // resolves synchronously — the tasks query starts in the same network
  // round-trip rather than waiting for a separate membership fetch.
  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select("role, status, onboarded_at, chapter_id, chapter:ambassador_chapters(name)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("joined_at", { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const chapterId = membership?.chapter_id;
  const isLeader = ["exco", "president", "global_team", "global_leaders", "global_president"].includes(membership?.role ?? "");

  // Fetch personal goals — RPC derives current_value at read time from
  // review_images / building_audit_logs / user_buildings / company_stewards,
  // since the ambassador_goals.current_value column itself is never written.
  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ["ambassador-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_ambassador_goals");
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch open chapter tasks (todo + in_progress) for the dashboard summary
  const { data: allTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["chapter-tasks", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_chapter_tasks", {
        p_chapter_id: chapterId!,
      });
      if (error) throw error;
      return (data ?? []) as ChapterTask[];
    },
    enabled: !!chapterId,
    staleTime: 30_000,
  });

  const openTasks = allTasks.filter((t) => t.status === "todo" || t.status === "in_progress");

  // Fetch personal activity timeline
  const { data: timeline, isLoading: loadingTimeline } = useQuery({
    queryKey: ["ambassador-timeline", user?.id],
    queryFn: () => fetchAmbassadorMyAuditTimeline(),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
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
      <EmbassyPageHeader
        eyebrow="Goals"
        title="Dashboard"
        description={`Welcome back. Here's what's on your plate for ${membership?.chapter?.name ?? "your chapter"}.`}
        actions={
          <Button onClick={() => setIsGoalOpen(true)} className="gap-2 min-h-11">
            <Plus className="h-4 w-4" /> Set a goal
          </Button>
        }
      />

      {/* ─── Open Tasks ─── */}
      {(loadingTasks || openTasks.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-text-secondary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-text-primary">Open tasks</h2>
              {!loadingTasks && openTasks.length > 0 && (
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-2xs font-normal tabular-nums">
                  {openTasks.length}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/embassy/tasks">View all tasks</Link>
            </Button>
          </div>
          {loadingTasks ? (
            <div className="space-y-2">
              {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full rounded-sm" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {openTasks.slice(0, 5).map((task) => (
                <OpenTaskRow key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
              {openTasks.length > 5 && (
                <p className="text-sm text-muted-foreground pl-1">
                  +{openTasks.length - 5} more —{" "}
                  <Link to="/embassy/tasks" className="underline underline-offset-2">
                    view all
                  </Link>
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className="space-y-8">
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-text-secondary" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight text-text-primary">Active goals</h2>
          </div>

          {loadingGoals ? (
            <div className="grid gap-4">
              {[0, 1].map(i => <Skeleton key={i} className={cn("h-32 w-full", EMBASSY_SKELETON_ROUNDED)} />)}
            </div>
          ) : goals?.filter(g => g.status === 'active').length === 0 ? (
            <EmbassyEmptyState
              title="No active goals"
              description="Set a target to keep yourself motivated."
            >
              <Button variant="outline" size="sm" onClick={() => setIsGoalOpen(true)}>Set your first goal</Button>
            </EmbassyEmptyState>
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
            <History className="h-5 w-5 text-text-secondary" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight text-text-primary">Recent contributions</h2>
          </div>

          {loadingTimeline ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-sm" />)}
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

      {/* Task detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <SheetContent className="w-full sm:max-w-md flex flex-col overflow-y-auto gap-0 p-0">
          {selectedTask && (() => {
            const task = selectedTask;
            const cfg = TASK_STATUS_CONFIG[task.status];
            const vis = VISIBILITY_CONFIG[task.visibility] ?? VISIBILITY_CONFIG["chapter"];
            const canEdit = task.created_by === user?.id || isLeader;
            return (
              <>
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-border-default">
                  <div className="flex-1 min-w-0 space-y-1">
                    <SheetTitle className={cn("text-xl font-bold leading-tight", task.status === "done" && "line-through opacity-60")}>
                      {task.title}
                    </SheetTitle>
                    {task.description ? (
                      <SheetDescription className="text-sm text-muted-foreground leading-relaxed">
                        {task.description}
                      </SheetDescription>
                    ) : (
                      <SheetDescription className="sr-only">Task detail</SheetDescription>
                    )}
                  </div>
                </SheetHeader>

                <div className="px-6 py-5 space-y-5 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-24 shrink-0">Status</span>
                    <Badge variant="outline" className={cn("gap-1.5", cfg.class)}>
                      {cfg.icon}
                      {cfg.label}
                    </Badge>
                  </div>

                  {task.due_date && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-24 shrink-0">Due</span>
                      <span className={cn("flex items-center gap-1.5 text-sm", openTaskDueDateClass(task.due_date))}>
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(parseISO(task.due_date), "d MMMM yyyy")}
                      </span>
                    </div>
                  )}

                  {task.assigned_to && task.assignee_username && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-24 shrink-0">Assigned to</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={task.assignee_avatar_url ?? undefined} />
                          <AvatarFallback className="text-[9px]">{initials(task.assignee_username)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">@{task.assignee_username}</span>
                      </div>
                    </div>
                  )}

                  {task.project_title && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-24 shrink-0">Project</span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        {task.project_title}
                      </span>
                    </div>
                  )}

                  {task.company_name && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-24 shrink-0">Firm</span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {task.company_name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-24 shrink-0">Visibility</span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {vis.icon}
                      {vis.label}
                    </span>
                  </div>

                  {task.creator_username && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-24 shrink-0">Created by</span>
                      <span className="text-sm">@{task.creator_username}</span>
                    </div>
                  )}

                  {task.created_at && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-24 shrink-0">Created</span>
                      <span className="text-sm text-muted-foreground">
                        {format(parseISO(task.created_at), "d MMM yyyy")}
                      </span>
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className="px-6 py-4 border-t border-border-default flex justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/embassy/tasks">Edit in Tasks</Link>
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

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
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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

function OpenTaskRow({ task, onClick }: { task: ChapterTask; onClick: () => void }) {
  const cfg = TASK_STATUS_CONFIG[task.status];
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-sm border border-border-default hover:bg-surface-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    >
      <span className={cn("shrink-0", cfg.class)}>{cfg.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{task.title}</p>
        {task.project_title && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <FolderOpen className="h-3 w-3" />
            {task.project_title}
          </p>
        )}
      </div>
      {task.due_date && (
        <span className={cn("flex items-center gap-1 text-xs shrink-0", openTaskDueDateClass(task.due_date))}>
          <CalendarDays className="h-3 w-3" />
          {format(parseISO(task.due_date), "d MMM")}
        </span>
      )}
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
    <Card className="space-y-4 border-border-default p-6 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-text-primary">{goal.title}</h3>
          <p className="text-xs text-text-secondary">
            {goal.current_value} / {goal.target_value} {metricLabels[goal.metric]}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border-default bg-surface-muted text-text-secondary">
          <TrendingUp className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-1.5 bg-surface-muted" />
        <div className="flex justify-between text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
          <span>{Math.round(progress)}% complete</span>
          <span>Started {formatDistanceToNow(new Date(goal.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </Card>
  );
}

function ActivityRow({ item }: { item: AmbassadorAuditRow }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-sm border hover:bg-surface-muted/50 transition-colors">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <History className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          <span className="font-semibold text-text-primary">{item.operation}</span> · {item.building_name}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ""}
        </p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

