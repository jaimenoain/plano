import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus, CheckCircle2, Circle, Clock, Loader2, Trash2,
  Eye, EyeOff, Users, Lock, CalendarDays, FolderOpen, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  EmbassyEmptyState,
  EmbassyErrorState,
  EmbassyPageHeader,
  EmbassySectionLabel,
  EMBASSY_SKELETON_ROUNDED,
} from "@/features/embassy/components/embassy-ui";

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
  todo:        { label: "To do",       icon: <Circle className="h-3.5 w-3.5" />,      class: "text-text-secondary" },
  in_progress: { label: "In progress", icon: <Clock className="h-3.5 w-3.5" />,       class: "text-feedback-warning" },
  done:        { label: "Done",        icon: <CheckCircle2 className="h-3.5 w-3.5" />, class: "text-feedback-success" },
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

// DB-writable columns on chapter_tasks (excludes RPC-derived join fields)
const DB_FIELDS = new Set([
  "title", "description", "due_date", "status", "visibility",
  "assigned_to", "project_id", "company_id",
]);

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
  if (isPast(d) && !isToday(d)) return "text-feedback-destructive";
  if (isToday(d)) return "text-feedback-warning";
  return "text-text-secondary";
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Card
// ─────────────────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  isOwner,
  isLeader,
  onStatusCycle,
  onOpen,
  onDelete,
  isCycling,
}: {
  task: ChapterTask;
  isOwner: boolean;
  isLeader: boolean;
  onStatusCycle: () => void;
  onOpen: () => void;
  onDelete: () => void;
  isCycling: boolean;
}) {
  const cfg = STATUS_CONFIG[task.status];
  const vis = VISIBILITY_CONFIG[task.visibility];
  const canEdit = isOwner || isLeader;

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group flex cursor-pointer flex-col gap-3 rounded-sm border border-border-default bg-surface-card p-4 transition-colors hover:border-border-strong",
        task.status === "done" && "opacity-60",
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Status toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onStatusCycle(); }}
          disabled={isCycling || !canEdit}
          className={cn(
            "mt-0.5 shrink-0 transition-colors",
            cfg.class,
            canEdit && "cursor-pointer hover:text-text-primary",
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
            <p className="mt-1 text-sm text-text-secondary line-clamp-2">{task.description}</p>
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
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <FolderOpen className="h-3 w-3" />
                {task.project_title}
              </span>
            )}
            {task.company_name && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Building2 className="h-3 w-3" />
                {task.company_name}
              </span>
            )}
            {task.visibility !== "chapter" && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                {vis.icon}
                {vis.label}
              </span>
            )}
          </div>
        </div>

        {/* Delete (visible on hover to owners/leaders) */}
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-feedback-destructive hover:text-feedback-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
          <span className="text-xs text-text-secondary">@{task.assignee_username}</span>
        </div>
      )}
    </div>
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [cyclingId, setCyclingId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ChapterTask | null>(null);

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState("");
  const [inlineCompanyQuery, setInlineCompanyQuery] = useState("");

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

  // ── company search (create dialog) ──
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

  // ── company search (inline edit in drawer) ──
  const { data: inlineCompanyResults = [], isFetching: isInlineSearching } = useQuery({
    queryKey: ["company-search-inline", inlineCompanyQuery],
    queryFn: async () => {
      if (inlineCompanyQuery.length < 2) return [] as CompanyOption[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("companies")
        .select("id, name")
        .ilike("name", `%${inlineCompanyQuery}%`)
        .order("name")
        .limit(8);
      return (data ?? []) as CompanyOption[];
    },
    enabled: editingField === "company" && inlineCompanyQuery.length >= 2,
    staleTime: 60_000,
  });

  // ── mutations ──

  // Create-only mutation for the New Task dialog
  const saveMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("chapter_tasks").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        visibility: form.visibility,
        assigned_to: form.assigned_to || null,
        project_id: form.project_id || null,
        company_id: form.company_id || null,
        chapter_id: chapterId!,
        created_by: user!.id,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task created");
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks", chapterId] });
    },
    onError: () => toast.error("Failed to create task. Please try again."),
  });

  // Inline per-field patch mutation
  const patchMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ChapterTask> }) => {
      const dbPatch = Object.fromEntries(
        Object.entries(patch).filter(([k]) => DB_FIELDS.has(k))
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("chapter_tasks")
        .update({ ...dbPatch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { patch }) => {
      setSelectedTask((t) => t ? { ...t, ...patch } : t);
      setEditingField(null);
      setInlineCompanyQuery("");
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks", chapterId] });
    },
    onError: () => toast.error("Failed to save."),
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
    onSuccess: (_, { id, status }) => {
      setSelectedTask((t) => t?.id === id ? { ...t, status } : t);
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks", chapterId] });
    },
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
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setForm(EMPTY_FORM);
  }

  function patchForm(patch: Partial<typeof EMPTY_FORM>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  // ── inline edit helpers ──
  function startEdit(field: string, draft: string) {
    if (patchMutation.isPending) return;
    setEditingField(field);
    setFieldDraft(draft);
    if (field === "company") {
      setInlineCompanyQuery(selectedTask?.company_name ?? "");
    }
  }

  function commitField(patch: Partial<ChapterTask>) {
    if (!selectedTask) return;
    patchMutation.mutate({ id: selectedTask.id, patch });
  }

  function cancelEdit() {
    setEditingField(null);
    setFieldDraft("");
    setInlineCompanyQuery("");
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
      <EmbassyPageHeader
        title="Tasks"
        description="Chapter tasks — create, assign, and track work across your team."
        actions={
          <Button onClick={openCreate} className="min-h-11 shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            New task
          </Button>
        }
      />

      {/* Body */}
      {isLoading ? (
        <div className="space-y-6">
          {[0, 1].map((g) => (
            <div key={g} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className={cn("h-24 w-full", EMBASSY_SKELETON_ROUNDED)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmbassyErrorState message="Failed to load tasks. Check your database migrations or try again." />
      ) : tasks.length === 0 ? (
        <EmbassyEmptyState
          icon={<CheckCircle2 className="h-10 w-10" />}
          title="No tasks yet"
          description="Create a task and assign it to a team member to get started."
        >
          <Button variant="outline" className="mt-2" onClick={openCreate}>
            Create the first task
          </Button>
        </EmbassyEmptyState>
      ) : (
        <div className="space-y-10">
          {groups.map(({ key, label, items }) => {
            if (items.length === 0) return null;
            const cfg = STATUS_CONFIG[key];
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center gap-3">
                  <EmbassySectionLabel className={cn("flex items-center gap-1.5", cfg.class)}>
                    {cfg.icon}
                    {label}
                  </EmbassySectionLabel>
                  <div className="flex-1 border-t border-border-default" />
                  <span className="text-xs text-text-secondary">{items.length}</span>
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
                      onOpen={() => { setSelectedTask(task); setEditingField(null); }}
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

      {/* Task detail Sheet — inline editable */}
      <Sheet
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) { setSelectedTask(null); cancelEdit(); }
        }}
      >
        <SheetContent className="w-full sm:max-w-md flex flex-col overflow-y-auto gap-0 p-0">
          {selectedTask && (() => {
            const task = selectedTask;
            const cfg = STATUS_CONFIG[task.status];
            const vis = VISIBILITY_CONFIG[task.visibility];
            const canEdit = task.created_by === user?.id || isLeader;
            const isSaving = patchMutation.isPending;

            // Shared class for editable rows
            const editableRowCls = (field: string) =>
              cn(
                "flex items-start gap-3 rounded-md -mx-2 px-2 py-1 transition-colors",
                canEdit && editingField !== field && "cursor-pointer hover:bg-surface-muted/50",
              );

            return (
              <>
                {/* ── Header: title + description ── */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-border-default space-y-2">
                  {/* Title */}
                  {editingField === "title" ? (
                    <input
                      autoFocus
                      aria-label="Task title"
                      className="w-full bg-transparent border-0 outline-none ring-0 text-xl font-bold leading-tight text-text-primary placeholder:text-text-secondary/60"
                      value={fieldDraft}
                      onChange={(e) => setFieldDraft(e.target.value)}
                      onBlur={() => {
                        const v = fieldDraft.trim();
                        if (v && v !== task.title) commitField({ title: v });
                        else cancelEdit();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                  ) : (
                    <SheetTitle
                      className={cn(
                        "text-xl font-bold leading-tight text-left",
                        task.status === "done" && "line-through opacity-60",
                        canEdit && "cursor-text rounded px-1 -mx-1 hover:bg-surface-muted/50 transition-colors",
                      )}
                      onClick={() => canEdit && startEdit("title", task.title)}
                    >
                      {task.title}
                    </SheetTitle>
                  )}

                  {/* Description */}
                  {editingField === "description" ? (
                    <textarea
                      autoFocus
                      aria-label="Task description"
                      rows={3}
                      className="w-full bg-transparent border-0 outline-none ring-0 text-sm text-text-secondary leading-relaxed resize-none placeholder:text-text-secondary/50"
                      placeholder="Add description…"
                      value={fieldDraft}
                      onChange={(e) => setFieldDraft(e.target.value)}
                      onBlur={() => {
                        const v = fieldDraft.trim() || null;
                        if (v !== task.description) commitField({ description: v });
                        else cancelEdit();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                  ) : (
                    <p
                      className={cn(
                        "text-sm text-text-secondary leading-relaxed text-left",
                        canEdit && "cursor-text rounded px-1 -mx-1 hover:bg-surface-muted/50 transition-colors",
                        !task.description && "italic text-text-secondary/50",
                      )}
                      onClick={() => canEdit && startEdit("description", task.description ?? "")}
                    >
                      {task.description || (canEdit ? "Add description…" : "")}
                    </p>
                  )}
                </SheetHeader>

                {/* ── Metadata rows ── */}
                <div className="px-6 py-5 space-y-1 flex-1">

                  {/* Status */}
                  <div
                    className={editableRowCls("status")}
                    onClick={() => { if (canEdit && editingField !== "status") setEditingField("status"); }}
                  >
                    <span className="text-sm text-text-secondary w-24 shrink-0 pt-0.5">Status</span>
                    {editingField === "status" ? (
                      <Select
                        value={task.status}
                        onValueChange={(v: TaskStatus) => commitField({ status: v })}
                        onOpenChange={(open) => { if (!open && editingField === "status") setEditingField(null); }}
                        open
                      >
                        <SelectTrigger className="h-7 w-36 text-xs" onClick={(e) => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              <span className={cn("flex items-center gap-1.5", v.class)}>
                                {v.icon}{v.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={cn("gap-1.5", cfg.class)}>
                        {isSaving && editingField === "status"
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : cfg.icon}
                        {cfg.label}
                      </Badge>
                    )}
                  </div>

                  {/* Due date */}
                  <div
                    className={editableRowCls("due_date")}
                    onClick={() => { if (canEdit && editingField !== "due_date") startEdit("due_date", task.due_date ?? ""); }}
                  >
                    <span className="text-sm text-text-secondary w-24 shrink-0 pt-0.5">Due</span>
                    {editingField === "due_date" ? (
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          autoFocus
                          type="date"
                          className="h-7 text-xs w-36"
                          value={fieldDraft}
                          onChange={(e) => setFieldDraft(e.target.value)}
                          onBlur={() => {
                            const v = fieldDraft || null;
                            if (v !== task.due_date) commitField({ due_date: v });
                            else cancelEdit();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                        {(fieldDraft || task.due_date) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-text-secondary"
                            onClick={() => commitField({ due_date: null })}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    ) : task.due_date ? (
                      <span className={cn("flex items-center gap-1.5 text-sm", dueDateClass(task.due_date))}>
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(parseISO(task.due_date), "d MMMM yyyy")}
                      </span>
                    ) : (
                      <span className={cn("text-sm", canEdit ? "text-text-secondary/50 italic" : "text-text-secondary")}>
                        {canEdit ? "Add due date…" : "—"}
                      </span>
                    )}
                  </div>

                  {/* Assignee */}
                  <div
                    className={editableRowCls("assigned_to")}
                    onClick={() => { if (canEdit && editingField !== "assigned_to") setEditingField("assigned_to"); }}
                  >
                    <span className="text-sm text-text-secondary w-24 shrink-0 pt-0.5">Assigned to</span>
                    {editingField === "assigned_to" ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={task.assigned_to ?? "__none__"}
                          onValueChange={(v) => {
                            const member = teamMembers.find((m) => m.user_id === v);
                            commitField({
                              assigned_to: v === "__none__" ? null : v,
                              assignee_username: member?.username ?? null,
                              assignee_avatar_url: member?.avatar_url ?? null,
                            });
                          }}
                          onOpenChange={(open) => { if (!open && editingField === "assigned_to") setEditingField(null); }}
                          open
                        >
                          <SelectTrigger className="h-7 w-40 text-xs">
                            <SelectValue />
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
                    ) : task.assigned_to && task.assignee_username ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={task.assignee_avatar_url ?? undefined} />
                          <AvatarFallback className="text-[9px]">{initials(task.assignee_username)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">@{task.assignee_username}</span>
                      </div>
                    ) : (
                      <span className={cn("text-sm", canEdit ? "text-text-secondary/50 italic" : "text-text-secondary")}>
                        {canEdit ? "Assign someone…" : "Unassigned"}
                      </span>
                    )}
                  </div>

                  {/* Project */}
                  <div
                    className={editableRowCls("project_id")}
                    onClick={() => { if (canEdit && editingField !== "project_id") setEditingField("project_id"); }}
                  >
                    <span className="text-sm text-text-secondary w-24 shrink-0 pt-0.5">Project</span>
                    {editingField === "project_id" ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={task.project_id ?? "__none__"}
                          onValueChange={(v) => {
                            const project = projects.find((p) => p.id === v);
                            commitField({
                              project_id: v === "__none__" ? null : v,
                              project_title: project?.title ?? null,
                            });
                          }}
                          onOpenChange={(open) => { if (!open && editingField === "project_id") setEditingField(null); }}
                          open
                        >
                          <SelectTrigger className="h-7 w-44 text-xs">
                            <SelectValue />
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
                    ) : task.project_title ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <FolderOpen className="h-3.5 w-3.5 text-text-secondary" />
                        {task.project_title}
                      </span>
                    ) : (
                      <span className={cn("text-sm", canEdit ? "text-text-secondary/50 italic" : "text-text-secondary")}>
                        {canEdit ? "Link a project…" : "—"}
                      </span>
                    )}
                  </div>

                  {/* Company / Firm */}
                  <div
                    className={editableRowCls("company")}
                    onClick={() => { if (canEdit && editingField !== "company") startEdit("company", task.company_name ?? ""); }}
                  >
                    <span className="text-sm text-text-secondary w-24 shrink-0 pt-0.5">Firm</span>
                    {editingField === "company" ? (
                      <div className="flex-1 space-y-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            placeholder="Search by firm name…"
                            className="h-7 text-xs flex-1"
                            value={inlineCompanyQuery}
                            onChange={(e) => setInlineCompanyQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                          />
                          {task.company_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-text-secondary shrink-0"
                              onClick={() => commitField({ company_id: null, company_name: null })}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        {inlineCompanyQuery.length >= 2 && (
                          <div className="border rounded-md divide-y max-h-36 overflow-y-auto">
                            {isInlineSearching ? (
                              <div className="p-2 text-xs text-text-secondary flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                              </div>
                            ) : inlineCompanyResults.length === 0 ? (
                              <div className="p-2 text-xs text-text-secondary">No firms found</div>
                            ) : (
                              inlineCompanyResults.map((co) => (
                                <button
                                  key={co.id}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
                                  onClick={() => commitField({ company_id: co.id, company_name: co.name })}
                                >
                                  <Building2 className="h-3 w-3 text-text-secondary shrink-0" />
                                  {co.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : task.company_name ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-text-secondary" />
                        {task.company_name}
                      </span>
                    ) : (
                      <span className={cn("text-sm", canEdit ? "text-text-secondary/50 italic" : "text-text-secondary")}>
                        {canEdit ? "Link a firm…" : "—"}
                      </span>
                    )}
                  </div>

                  {/* Visibility */}
                  <div
                    className={editableRowCls("visibility")}
                    onClick={() => { if (canEdit && editingField !== "visibility") setEditingField("visibility"); }}
                  >
                    <span className="text-sm text-text-secondary w-24 shrink-0 pt-0.5">Visibility</span>
                    {editingField === "visibility" ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={task.visibility}
                          onValueChange={(v: TaskVisibility) => commitField({ visibility: v })}
                          onOpenChange={(open) => { if (!open && editingField === "visibility") setEditingField(null); }}
                          open
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chapter">
                              <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> Everyone</span>
                            </SelectItem>
                            {isLeader && (
                              <SelectItem value="leadership">
                                <span className="flex items-center gap-1.5"><Eye className="h-3 w-3" /> Leadership</span>
                              </SelectItem>
                            )}
                            <SelectItem value="only_me">
                              <span className="flex items-center gap-1.5"><EyeOff className="h-3 w-3" /> Only me</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                        {vis.icon}
                        {vis.label}
                      </span>
                    )}
                  </div>

                  {/* Created by — read-only */}
                  {task.creator_username && (
                    <div className="flex items-center gap-3 px-2 py-1">
                      <span className="text-sm text-text-secondary w-24 shrink-0">Created by</span>
                      <span className="text-sm">@{task.creator_username}</span>
                    </div>
                  )}

                  {/* Created at — read-only */}
                  <div className="flex items-center gap-3 px-2 py-1">
                    <span className="text-sm text-text-secondary w-24 shrink-0">Created</span>
                    <span className="text-sm text-text-secondary">
                      {format(parseISO(task.created_at), "d MMM yyyy")}
                    </span>
                  </div>

                  {/* Saving indicator */}
                  {isSaving && (
                    <div className="flex items-center gap-1.5 px-2 pt-1 text-xs text-text-secondary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving…
                    </div>
                  )}
                </div>

                {/* Footer — delete */}
                {canEdit && (
                  <div className="px-6 py-4 border-t border-border-default flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-feedback-destructive hover:text-feedback-destructive gap-1.5"
                      onClick={() => {
                        if (confirm("Delete this task?")) {
                          setSelectedTask(null);
                          deleteMutation.mutate(task.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Create dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>
              Tasks are visible to your whole chapter by default.
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
              <Label htmlFor="task-visibility">Visibility</Label>
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
                    <Building2 className="h-3.5 w-3.5 text-text-secondary shrink-0" />
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
                        <div className="p-2 text-xs text-text-secondary flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                        </div>
                      ) : companyResults.length === 0 ? (
                        <div className="p-2 text-xs text-text-secondary">No firms found</div>
                      ) : (
                        companyResults.map((co) => (
                          <button
                            key={co.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                            onClick={() =>
                              patchForm({ company_id: co.id, company_name: co.name, company_query: co.name })
                            }
                          >
                            <Building2 className="h-3.5 w-3.5 text-text-secondary shrink-0" />
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
                : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
