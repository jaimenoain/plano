import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus, CheckCircle2, Circle, Clock, AlertCircle, Loader2, Trash2,
  Eye, EyeOff, Users, Lock, CalendarDays, FolderOpen, Building2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, parseISO } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TaskVisibility = "chapter" | "leadership" | "only_me";
type TaskStatus = "todo" | "in_progress" | "done";

interface ChapterTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  visibility: TaskVisibility;
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

interface TeamMember {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; class: string }> = {
  todo:        { label: "To do",       icon: <Circle className="h-3.5 w-3.5" />,      class: "text-muted-foreground" },
  in_progress: { label: "In progress", icon: <Clock className="h-3.5 w-3.5" />,       class: "text-amber-600" },
  done:        { label: "Done",        icon: <CheckCircle2 className="h-3.5 w-3.5" />, class: "text-green-600" },
};

const VISIBILITY_CONFIG: Record<TaskVisibility, { label: string; icon: React.ReactNode }> = {
  chapter:    { label: "Everyone",   icon: <Users className="h-3 w-3" /> },
  leadership: { label: "Leadership", icon: <Eye className="h-3 w-3" /> },
  only_me:    { label: "Only me",    icon: <EyeOff className="h-3 w-3" /> },
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function initials(username: string) {
  return username
    .split(/[\s_-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function dueDateClass(due: string | null): string {
  if (!due) return "";
  const d = parseISO(due);
  if (isPast(d) && !isToday(d)) return "text-destructive";
  if (isToday(d)) return "text-amber-600";
  return "text-muted-foreground";
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Card
// ─────────────────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  isOwner,
  isLeader,
  onStatusCycle,
  onEdit,
  onDelete,
  isCycling,
}: {
  task: ChapterTask;
  isOwner: boolean;
  isLeader: boolean;
  onStatusCycle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isCycling: boolean;
}) {
  const cfg = STATUS_CONFIG[task.status];
  const vis = VISIBILITY_CONFIG[task.visibility];
  const canEdit = isOwner || isLeader;

  return (
    <Card className={cn(
      "group flex flex-col gap-3 p-4 transition-all hover:shadow-sm",
      task.status === "done" && "opacity-60",
    )}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Status toggle */}
        <button
          onClick={onStatusCycle}
          disabled={isCycling || !canEdit}
          className={cn(
            "mt-0.5 shrink-0 transition-colors",
            cfg.class,
            canEdit && "hover:text-brand-primary cursor-pointer",
            !canEdit && "cursor-default",
          )}
          title={canEdit ? `Mark as ${STATUS_CONFIG[NEXT_STATUS[task.status]].label}` : cfg.label}
        >
          {isCycling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : cfg.icon}
        </button>

        {/* Title + metadata */}
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium leading-snug", task.status === "done" && "line-through")}>
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          {/* Metadata pills */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {task.due_date && (
              <span className={cn("flex items-center gap-1 text-xs", dueDateClass(task.due_date))}>
                <CalendarDays className="h-3 w-3" />
                {format(parseISO(task.due_date), "d MMM yyyy")}
              </span>
            )}
            {task.project_title && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FolderOpen className="h-3 w-3" />
                {task.project_title}
              </span>
            )}
            {task.company_name && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {task.company_name}
              </span>
            )}
            {task.visibility !== "chapter" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {vis.icon}
                {vis.label}
              </span>
            )}
          </div>
        </div>

        {/* Actions (visible on hover to owners/leaders) */}
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Assignee footer */}
      {task.assigned_to && task.assignee_username && (
        <div className="flex items-center gap-2 pt-2 border-t border-border-default">
          <Avatar className="h-5 w-5">
            <AvatarImage src={task.assignee_avatar_url ?? undefined} />
            <AvatarFallback className="text-[9px]">{initials(task.assignee_username)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">@{task.assignee_username}</span>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  description: "",
  due_date: "",
  visibility: "chapter" as TaskVisibility,
  assigned_to: "",
  project_id: "",
  company_query: "",
  company_id: "",
  company_name: "",
};

export default function TasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ChapterTask | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cyclingId, setCyclingId] = useState<string | null>(null);

  // ── membership ──
  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership-tasks", user?.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("ambassador_memberships")
        .select("chapter_id, role")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as { chapter_id: string; role: string };
    },
    enabled: !!user,
  });

  const chapterId = membership?.chapter_id;
  const isLeader = ["exco", "president", "global_team", "global_leaders", "global_president"].includes(membership?.role ?? "");

  // ── tasks ──
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["chapter-tasks", chapterId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_chapter_tasks", {
        p_chapter_id: chapterId,
      });
      if (error) throw error;
      return (data ?? []) as ChapterTask[];
    },
    enabled: !!chapterId,
    staleTime: 30_000,
  });

  // ── team members (for assignee dropdown) ──
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["chapter-team-tasks", chapterId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_chapter_team", {
        p_chapter_id: chapterId,
      });
      if (error) return [] as TeamMember[];
      return (data ?? []) as TeamMember[];
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });

  // ── projects (for link dropdown) ──
  const { data: projects = [] } = useQuery({
    queryKey: ["chapter-projects-tasks", chapterId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("chapter_projects")
        .select("id, title, status")
        .eq("chapter_id", chapterId)
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false });
      return (data ?? []) as Project[];
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });

  // ── company search ──
  const { data: companyResults = [], isFetching: isSearching } = useQuery({
    queryKey: ["company-search-tasks", form.company_query],
    queryFn: async () => {
      if (!form.company_query || form.company_query.length < 2) return [] as CompanyOption[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("companies")
        .select("id, name")
        .ilike("name", `%${form.company_query}%`)
        .order("name")
        .limit(8);
      return (data ?? []) as CompanyOption[];
    },
    enabled: form.company_query.length >= 2,
    staleTime: 60_000,
  });

  // ── mutations ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        visibility: form.visibility,
        assigned_to: form.assigned_to || null,
        project_id: form.project_id || null,
        company_id: form.company_id || null,
        updated_at: new Date().toISOString(),
      };
      if (editingTask) {
        const { error } = await db.from("chapter_tasks").update(payload).eq("id", editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("chapter_tasks").insert({
          ...payload,
          chapter_id: chapterId!,
          created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingTask ? "Task updated" : "Task created");
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks", chapterId] });
    },
    onError: () => toast.error("Failed to save task. Please try again."),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("chapter_tasks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id }) => setCyclingId(id),
    onSettled: () => setCyclingId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chapter-tasks", chapterId] }),
    onError: () => toast.error("Failed to update status."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("chapter_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks", chapterId] });
    },
    onError: () => toast.error("Failed to delete task."),
  });

  // ── dialog helpers ──
  function openCreate() {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  }

  function openEdit(task: ChapterTask) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      due_date: task.due_date ?? "",
      visibility: task.visibility,
      assigned_to: task.assigned_to ?? "",
      project_id: task.project_id ?? "",
      company_query: task.company_name ?? "",
      company_id: task.company_id ?? "",
      company_name: task.company_name ?? "",
    });
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingTask(null);
    setForm(EMPTY_FORM);
  }

  function patchForm(patch: Partial<typeof EMPTY_FORM>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  // ── grouped tasks ──
  const todo = tasks.filter((t) => t.status === "todo");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");

  const groups: Array<{ key: TaskStatus; label: string; items: ChapterTask[] }> = [
    { key: "todo",        label: "To do",       items: todo },
    { key: "in_progress", label: "In progress", items: inProgress },
    { key: "done",        label: "Done",        items: done },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Chapter tasks — create, assign, and track work across your team.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-6">
          {[0, 1].map((g) => (
            <div key={g} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-12 text-center border rounded-xl bg-destructive/5 text-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Failed to load tasks</p>
          <p className="text-sm opacity-80 mt-1">Check your database migrations or try again.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-20 text-center border border-dashed rounded-xl space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-medium">No tasks yet</p>
            <p className="text-muted-foreground text-sm">
              Create a task and assign it to a team member to get started.
            </p>
          </div>
          <Button variant="outline" onClick={openCreate}>Create the first task</Button>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ key, label, items }) => {
            if (items.length === 0) return null;
            const cfg = STATUS_CONFIG[key];
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={cn("flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider", cfg.class)}>
                    {cfg.icon}
                    {label}
                  </span>
                  <div className="flex-1 border-t border-border-default" />
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isOwner={task.created_by === user?.id}
                      isLeader={isLeader}
                      onStatusCycle={() =>
                        statusMutation.mutate({ id: task.id, status: NEXT_STATUS[task.status] })
                      }
                      onEdit={() => openEdit(task)}
                      onDelete={() => {
                        if (confirm("Delete this task?")) deleteMutation.mutate(task.id);
                      }}
                      isCycling={cyclingId === task.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update this task's details."
                : "Tasks are visible to your whole chapter by default."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="e.g. Document all Brutalist buildings in the city centre"
                value={form.title}
                onChange={(e) => patchForm({ title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-description">Description (optional)</Label>
              <Textarea
                id="task-description"
                placeholder="What needs to be done? Any important context?"
                rows={3}
                value={form.description}
                onChange={(e) => patchForm({ description: e.target.value })}
              />
            </div>

            {/* Due date + Assigned to (two-col row) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="task-due">Due date (optional)</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => patchForm({ due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-assigned">Assign to (optional)</Label>
                <Select
                  value={form.assigned_to}
                  onValueChange={(v) => patchForm({ assigned_to: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger id="task-assigned">
                    <SelectValue placeholder="Anyone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Anyone</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        @{m.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="task-visibility">
                Visibility
              </Label>
              <Select
                value={form.visibility}
                onValueChange={(v: TaskVisibility) => patchForm({ visibility: v })}
              >
                <SelectTrigger id="task-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chapter">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> Everyone in the chapter
                    </span>
                  </SelectItem>
                  {isLeader && (
                    <SelectItem value="leadership">
                      <span className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5" /> Leadership only (President & ExCo)
                      </span>
                    </SelectItem>
                  )}
                  <SelectItem value="only_me">
                    <span className="flex items-center gap-2">
                      <EyeOff className="h-3.5 w-3.5" /> Only me
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linked project */}
            {projects.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="task-project">Link to project (optional)</Label>
                <Select
                  value={form.project_id}
                  onValueChange={(v) => patchForm({ project_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger id="task-project">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Link to architecture firm */}
            <div className="space-y-2">
              <Label htmlFor="task-firm">Link to architecture firm (optional)</Label>
              {form.company_id ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 border rounded-md text-sm flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {form.company_name}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => patchForm({ company_id: "", company_name: "", company_query: "" })}
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    id="task-firm"
                    placeholder="Search by firm name…"
                    value={form.company_query}
                    onChange={(e) => patchForm({ company_query: e.target.value })}
                  />
                  {form.company_query.length >= 2 && (
                    <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-2 text-xs text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                        </div>
                      ) : companyResults.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">No firms found</div>
                      ) : (
                        companyResults.map((co) => (
                          <button
                            key={co.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                            onClick={() =>
                              patchForm({ company_id: co.id, company_name: co.name, company_query: co.name })
                            }
                          >
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {co.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.title.trim()}
            >
              {saveMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : editingTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
