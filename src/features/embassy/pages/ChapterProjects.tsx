import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus, Pin, CheckCircle2, Archive, Loader2, AlertCircle, Trash2,
  Target, Lightbulb, CheckCheck, Inbox, Circle, Clock, CalendarDays,
  Users, EyeOff, Pencil, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, parseISO, isPast, isToday } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Project = {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  status: "draft" | "planning" | "active" | "completed" | "archived";
  created_by: string;
  created_at: string;
  author_username?: string | null;
};

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  metric_type: "photos" | "edits" | "outreach";
  target_value: number;
  chapter_scope: "all" | "specific";
};

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

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; class: string }> = {
  todo:        { label: "To do",       icon: <Circle className="h-3.5 w-3.5" />,       class: "text-muted-foreground" },
  in_progress: { label: "In progress", icon: <Clock className="h-3.5 w-3.5" />,        class: "text-amber-600" },
  done:        { label: "Done",        icon: <CheckCircle2 className="h-3.5 w-3.5" />, class: "text-green-600" },
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const PROJECT_STATUS_CONFIG = {
  active:    { icon: <Zap className="h-3 w-3" />,          class: "bg-brand-primary/10 text-brand-primary border-brand-primary/20" },
  planning:  { icon: <Clock className="h-3 w-3" />,        class: "bg-blue-50 text-blue-600 border-blue-200" },
  completed: { icon: <CheckCircle2 className="h-3 w-3" />, class: "bg-green-500/10 text-green-600 border-green-500/20" },
  archived:  { icon: <Archive className="h-3 w-3" />,      class: "bg-muted text-muted-foreground border-border-default" },
  draft:     { icon: <Lightbulb className="h-3 w-3" />,    class: "bg-amber-50 text-amber-700 border-amber-200" },
};

const EMPTY_TASK_FORM = {
  title: "",
  description: "",
  due_date: "",
  visibility: "chapter" as TaskVisibility,
  assigned_to: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function taskInitials(username: string) {
  return username.split(/[\s_-]/).map((p) => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

function dueDateClass(due: string | null): string {
  if (!due) return "";
  const d = parseISO(due);
  if (isPast(d) && !isToday(d)) return "text-destructive";
  if (isToday(d)) return "text-amber-600";
  return "text-muted-foreground";
}

async function fetchCampaignProgress(campaign: Campaign, chapterId: string): Promise<number> {
  const { start_date, end_date, metric_type } = campaign;
  const endTs = end_date + "T23:59:59Z";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  if (metric_type === "photos") {
    const { data: memberIds } = await db
      .from("ambassador_memberships")
      .select("user_id")
      .eq("chapter_id", chapterId)
      .eq("status", "active");
    if (!memberIds?.length) return 0;
    const ids = memberIds.map((m: { user_id: string }) => m.user_id);
    const { count } = await db
      .from("review_images")
      .select("id", { count: "exact", head: true })
      .in("user_id", ids)
      .gte("created_at", start_date)
      .lte("created_at", endTs);
    return count ?? 0;
  }

  if (metric_type === "edits") {
    const { data: memberIds } = await db
      .from("ambassador_memberships")
      .select("user_id")
      .eq("chapter_id", chapterId)
      .eq("status", "active");
    if (!memberIds?.length) return 0;
    const ids = memberIds.map((m: { user_id: string }) => m.user_id);
    const { count } = await db
      .from("building_audit_logs")
      .select("id", { count: "exact", head: true })
      .in("user_id", ids)
      .gte("created_at", start_date)
      .lte("created_at", endTs);
    return count ?? 0;
  }

  // outreach
  const { data: memberMemberships } = await db
    .from("ambassador_memberships")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("status", "active");
  if (!memberMemberships?.length) return 0;
  const membershipIds = memberMemberships.map((m: { id: string }) => m.id);
  const { count } = await db
    .from("outreach_log")
    .select("id", { count: "exact", head: true })
    .in("ambassador_id", membershipIds)
    .gte("created_at", start_date)
    .lte("created_at", endTs);
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ChapterProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Leader: pin/edit project dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"planning" | "active" | "completed" | "archived">("active");

  // Ambassador: submit idea dialog
  const [isIdeaOpen, setIsIdeaOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");

  // Project detail drawer
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [cyclingTaskId, setCyclingTaskId] = useState<string | null>(null);

  // Project inline editing (in detail Sheet)
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState("");

  // Task editing
  const [editingTask, setEditingTask] = useState<ChapterTask | null>(null);
  const [editTaskForm, setEditTaskForm] = useState(EMPTY_TASK_FORM);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);

  // ── membership ──
  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership-projects", user?.id],
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

  const isLeader = ["exco", "president", "global_team", "global_leaders", "global_president"].includes(membership?.role ?? "");
  const chapterId = membership?.chapter_id;

  // ── projects (all owner usernames batch-fetched) ──
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["chapter-projects", chapterId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data, error } = await db
        .from("chapter_projects")
        .select("*")
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data as Project[];

      // chapter_projects.created_by → auth.users(id), not profiles(id),
      // so FK-hint joins don't work — use a separate profiles lookup.
      const authorIds = Array.from(new Set(rows.map((r) => r.created_by)));
      if (authorIds.length > 0) {
        const { data: profileRows } = await db
          .from("profiles")
          .select("id, username")
          .in("id", authorIds);
        const profileMap = new Map<string, string>(
          ((profileRows ?? []) as Array<{ id: string; username: string | null }>)
            .filter((p) => p.username)
            .map((p) => [p.id, p.username as string]),
        );
        return rows.map((r) => ({ ...r, author_username: profileMap.get(r.created_by) ?? null }));
      }
      return rows;
    },
    enabled: !!chapterId,
  });

  // ── campaigns ──
  const { data: campaigns = [] } = useQuery({
    queryKey: ["programme-campaigns-portal", chapterId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("programme_campaigns")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) return [] as Campaign[];
      return data as Campaign[];
    },
    enabled: !!chapterId,
  });

  const { data: campaignProgress = {} } = useQuery({
    queryKey: ["programme-campaigns-progress-portal", chapterId, campaigns.map((c) => c.id).join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        campaigns.map(async (c) => [c.id, await fetchCampaignProgress(c, chapterId!)] as [string, number]),
      );
      return Object.fromEntries(entries);
    },
    enabled: !!chapterId && campaigns.length > 0,
  });

  // ── tasks (for project detail drawer) ──
  const { data: tasks = [] } = useQuery({
    queryKey: ["chapter-tasks-projects", chapterId],
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

  // ── team members (for assignee dropdown in task creation) ──
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["chapter-team-projects", chapterId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc("get_chapter_team", {
        p_chapter_id: chapterId,
      });
      return (data ?? []) as TeamMember[];
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });

  // ── project mutations ──

  const saveMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      if (editingProject) {
        const { error } = await db
          .from("chapter_projects")
          .update({ title, description, status, updated_at: new Date().toISOString() })
          .eq("id", editingProject.id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("chapter_projects")
          .insert({
            chapter_id: chapterId!,
            title,
            description,
            status,
            created_by: user!.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProject ? "Project updated" : "Project created");
      setIsCreateOpen(false);
      resetLeaderForm();
      queryClient.invalidateQueries({ queryKey: ["chapter-projects", chapterId] });
    },
    onError: () => {
      toast.error("Failed to save project.");
    },
  });

  const submitIdeaMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { error } = await db
        .from("chapter_projects")
        .insert({
          chapter_id: chapterId!,
          title: ideaTitle,
          description: ideaDescription || null,
          status: "draft",
          created_by: user!.id,
        });
      if (error) throw error;

      const { data: leaders } = await db
        .from("ambassador_memberships")
        .select("user_id")
        .eq("chapter_id", chapterId!)
        .eq("status", "active")
        .in("role", ["president", "exco", "global_leaders", "global_team", "global_president"]);

      if (leaders && leaders.length > 0) {
        const notifications = leaders
          .filter((l: { user_id: string }) => l.user_id !== user!.id)
          .map((l: { user_id: string }) => ({
            user_id: l.user_id,
            actor_id: user!.id,
            type: "project_idea_submitted",
            metadata: { chapter_id: chapterId, idea_title: ideaTitle },
          }));
        if (notifications.length > 0) {
          await db.from("notifications").insert(notifications);
        }
      }
    },
    onSuccess: () => {
      toast.success("Idea submitted — your chapter's leadership will review it.");
      setIsIdeaOpen(false);
      setIdeaTitle("");
      setIdeaDescription("");
      queryClient.invalidateQueries({ queryKey: ["chapter-projects", chapterId] });
    },
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error("submitIdeaMutation error:", err);
      toast.error("Failed to submit idea. Please try again.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("chapter_projects")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Idea published as a chapter project.");
      queryClient.invalidateQueries({ queryKey: ["chapter-projects", chapterId] });
    },
    onError: () => {
      toast.error("Failed to publish idea.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("chapter_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project removed");
      queryClient.invalidateQueries({ queryKey: ["chapter-projects", chapterId] });
    },
  });

  // ── task mutations ──

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("chapter_tasks").insert({
        chapter_id: chapterId!,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        due_date: taskForm.due_date || null,
        visibility: taskForm.visibility,
        assigned_to: taskForm.assigned_to || null,
        project_id: selectedProject!.id,
        created_by: user!.id,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task added to project.");
      setIsAddTaskOpen(false);
      setTaskForm(EMPTY_TASK_FORM);
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks-projects", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks", chapterId] });
    },
    onError: () => toast.error("Failed to create task."),
  });

  const taskStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: TaskStatus }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("chapter_tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id }) => setCyclingTaskId(id),
    onSettled: () => setCyclingTaskId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks-projects", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks", chapterId] });
    },
    onError: () => toast.error("Failed to update task status."),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("chapter_tasks")
        .update({
          title: editTaskForm.title.trim(),
          description: editTaskForm.description.trim() || null,
          due_date: editTaskForm.due_date || null,
          visibility: editTaskForm.visibility,
          assigned_to: editTaskForm.assigned_to || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTask!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task updated.");
      setIsEditTaskOpen(false);
      setEditingTask(null);
      setEditTaskForm(EMPTY_TASK_FORM);
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks-projects", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["chapter-tasks", chapterId] });
    },
    onError: () => toast.error("Failed to update task."),
  });

  const patchProjectMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Project, "title" | "description" | "status">>;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("chapter_projects")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ patch }) => {
      setSelectedProject((p) => (p ? { ...p, ...patch } : p));
      setEditingField(null);
      setFieldDraft("");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-projects", chapterId] });
    },
    onError: () => {
      toast.error("Failed to save changes.");
      queryClient.invalidateQueries({ queryKey: ["chapter-projects", chapterId] });
    },
  });

  // ── helpers ──

  const resetLeaderForm = () => {
    setTitle("");
    setDescription("");
    setStatus("active");
    setEditingProject(null);
  };

  const commitProjectField = (patch: Partial<Pick<Project, "title" | "description" | "status">>) => {
    if (!selectedProject) return;
    patchProjectMutation.mutate({ id: selectedProject.id, patch });
  };

  const openEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setTitle(project.title);
    setDescription(project.description || "");
    setStatus(project.status === "draft" ? "active" : project.status as "planning" | "active" | "completed" | "archived");
    setIsCreateOpen(true);
  };

  const openEditTask = (task: ChapterTask) => {
    setEditingTask(task);
    setEditTaskForm({
      title: task.title,
      description: task.description ?? "",
      due_date: task.due_date ?? "",
      visibility: task.visibility,
      assigned_to: task.assigned_to ?? "",
    });
    setIsEditTaskOpen(true);
  };

  const drafts = projects?.filter((p) => p.status === "draft") ?? [];
  const published = projects?.filter((p) => p.status !== "draft") ?? [];
  const projectTasks = selectedProject
    ? tasks.filter((t) => t.project_id === selectedProject.id)
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Chapter Projects</h1>
          <p className="text-muted-foreground">Priority initiatives and goals for your chapter.</p>
        </div>
        <div className="flex items-center gap-2">
          {!isLeader && (
            <Button
              variant="outline"
              onClick={() => setIsIdeaOpen(true)}
              className="gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              Submit Idea
            </Button>
          )}
          {isLeader && (
            <Button onClick={() => { resetLeaderForm(); setIsCreateOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Create Project
            </Button>
          )}
        </div>
      </div>

      {/* Programme campaigns */}
      {campaigns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-brand-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Programme campaigns
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => {
              const progress = campaignProgress[c.id] ?? 0;
              const pct = Math.min(100, Math.round((progress / c.target_value) * 100));
              return (
                <Card
                  key={c.id}
                  className="flex flex-col p-5 border-l-4 border-l-brand-accent"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge
                      variant="outline"
                      className="gap-1 px-2 py-0.5 text-xs font-medium bg-brand-accent/10 text-brand-accent border-brand-accent/20"
                    >
                      <Target className="h-3 w-3" />
                      Programme campaign
                    </Badge>
                    <span className="text-xs text-text-secondary capitalize">{c.metric_type}</span>
                  </div>
                  <h3 className="text-base font-bold mb-1">{c.title}</h3>
                  {c.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {c.description}
                    </p>
                  )}
                  <div className="mt-auto space-y-2">
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Chapter progress</span>
                      <span>{progress} / {c.target_value} ({pct}%)</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-[10px] text-text-secondary">
                      {format(parseISO(c.start_date), "d MMM")} – {format(parseISO(c.end_date), "d MMM yyyy")}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Draft ideas inbox — visible to leadership only */}
      {isLeader && drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Ideas inbox
            </h2>
            <Badge variant="secondary" className="text-xs">{drafts.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((project) => (
              <DraftCard
                key={project.id}
                project={project}
                onPublish={() => publishMutation.mutate(project.id)}
                onEdit={(e) => openEdit(project, e)}
                onDelete={() => { if (confirm("Delete this idea?")) deleteMutation.mutate(project.id); }}
                isPublishing={publishMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Published projects */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="p-12 text-center border rounded-xl bg-destructive/5 text-destructive">
          <AlertCircle className="h-10 w-10 mx-auto mb-3" />
          <p className="text-lg font-medium">Could not load projects</p>
          <p className="text-sm opacity-80">Check your database migrations or try again later.</p>
        </div>
      ) : published.length === 0 ? (
        <div className="p-20 text-center border border-dashed rounded-xl space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Pin className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-medium">No projects yet</p>
            <p className="text-muted-foreground">
              {isLeader
                ? "Create projects here, or publish an idea from the inbox above."
                : "No projects have been created yet. Submit an idea using the button above."}
            </p>
          </div>
          {isLeader && (
            <Button variant="outline" onClick={() => { resetLeaderForm(); setIsCreateOpen(true); }}>
              Create the first project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {published.map((project) => {
            const taskCount = tasks.filter((t) => t.project_id === project.id).length;
            return (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={taskCount}
                isLeader={isLeader}
                onOpen={() => setSelectedProject(project)}
                onEdit={(e) => openEdit(project, e)}
                onDelete={(e) => {
                  e.stopPropagation();
                  if (confirm("Remove this project?")) deleteMutation.mutate(project.id);
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Project detail Sheet ── */}
      <Sheet open={!!selectedProject} onOpenChange={(open) => { if (!open) { setSelectedProject(null); setEditingField(null); setFieldDraft(""); } }}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col overflow-y-auto gap-0 p-0">
          {selectedProject && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border-default space-y-2">
                {/* Title — click to edit (leaders only) */}
                {editingField === "title" ? (
                  <input
                    autoFocus
                    aria-label="Project title"
                    className="w-full bg-transparent border-0 outline-none ring-0 text-xl font-bold leading-tight text-text-primary placeholder:text-muted-foreground/60"
                    value={fieldDraft}
                    onChange={(e) => setFieldDraft(e.target.value)}
                    onBlur={() => {
                      const v = fieldDraft.trim();
                      if (v && v !== selectedProject.title) commitProjectField({ title: v });
                      else { setEditingField(null); setFieldDraft(""); }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") { setEditingField(null); setFieldDraft(""); }
                    }}
                  />
                ) : (
                  <SheetTitle
                    className={cn(
                      "text-xl font-bold leading-tight text-left",
                      isLeader && "cursor-text rounded px-1 -mx-1 hover:bg-muted/50 transition-colors",
                    )}
                    onClick={() => {
                      if (isLeader) { setEditingField("title"); setFieldDraft(selectedProject.title); }
                    }}
                  >
                    {selectedProject.title}
                  </SheetTitle>
                )}

                {/* Description — click to edit (leaders only) */}
                {editingField === "description" ? (
                  <textarea
                    autoFocus
                    aria-label="Project description"
                    rows={3}
                    className="w-full bg-transparent border-0 outline-none ring-0 text-sm text-muted-foreground leading-relaxed resize-none placeholder:text-muted-foreground/50"
                    placeholder="Add description…"
                    value={fieldDraft}
                    onChange={(e) => setFieldDraft(e.target.value)}
                    onBlur={() => {
                      const v = fieldDraft.trim() || null;
                      if (v !== selectedProject.description) commitProjectField({ description: v });
                      else { setEditingField(null); setFieldDraft(""); }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setEditingField(null); setFieldDraft(""); }
                    }}
                  />
                ) : (
                  <p
                    className={cn(
                      "text-sm text-muted-foreground leading-relaxed text-left",
                      isLeader && "cursor-text rounded px-1 -mx-1 hover:bg-muted/50 transition-colors",
                      !selectedProject.description && "italic text-muted-foreground/50",
                    )}
                    onClick={() => {
                      if (isLeader) { setEditingField("description"); setFieldDraft(selectedProject.description ?? ""); }
                    }}
                  >
                    {selectedProject.description || (isLeader ? "Add description…" : "")}
                  </p>
                )}

                {/* Project meta */}
                <div className="flex flex-wrap items-center gap-3 pt-3 text-sm text-muted-foreground">
                  {/* Status — click to edit (leaders only) */}
                  {editingField === "status" ? (
                    <Select
                      value={selectedProject.status}
                      onValueChange={(v) => commitProjectField({ status: v as Project["status"] })}
                      onOpenChange={(open) => { if (!open && editingField === "status") setEditingField(null); }}
                      open
                    >
                      <SelectTrigger className="h-7 w-36 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["planning", "active", "completed", "archived"] as const).map((s) => (
                          <SelectItem key={s} value={s}>
                            <span className={cn("flex items-center gap-1.5 capitalize", PROJECT_STATUS_CONFIG[s].class)}>
                              {PROJECT_STATUS_CONFIG[s].icon}{s}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 px-2 py-0.5 capitalize font-medium text-xs",
                        PROJECT_STATUS_CONFIG[selectedProject.status].class,
                        isLeader && "cursor-pointer hover:ring-1 hover:ring-border-default transition-all",
                      )}
                      onClick={() => { if (isLeader) setEditingField("status"); }}
                    >
                      {PROJECT_STATUS_CONFIG[selectedProject.status].icon}
                      {selectedProject.status}
                    </Badge>
                  )}
                  {selectedProject.author_username && (
                    <span className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {selectedProject.author_username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">@{selectedProject.author_username}</span>
                    </span>
                  )}
                  <span className="text-xs">
                    Created {formatDistanceToNow(new Date(selectedProject.created_at), { addSuffix: true })}
                  </span>
                </div>
              </SheetHeader>

              {/* Tasks section */}
              <div className="flex-1 px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                    Tasks
                    {projectTasks.length > 0 && (
                      <Badge variant="secondary" className="text-xs font-normal">{projectTasks.length}</Badge>
                    )}
                  </h3>
                  <Button size="sm" className="gap-1.5" onClick={() => setIsAddTaskOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Task
                  </Button>
                </div>

                {projectTasks.length === 0 ? (
                  <div className="py-12 text-center border border-dashed rounded-lg space-y-2">
                    <Circle className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No tasks yet — add the first one above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectTasks.map((task) => (
                      <DrawerTaskRow
                        key={task.id}
                        task={task}
                        canEdit={task.created_by === user?.id || isLeader}
                        onStatusCycle={() =>
                          taskStatusMutation.mutate({ id: task.id, newStatus: NEXT_STATUS[task.status] })
                        }
                        onEdit={() => openEditTask(task)}
                        isCycling={cyclingTaskId === task.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Add Task dialog (opens from inside the Sheet) ── */}
      <Dialog
        open={isAddTaskOpen}
        onOpenChange={(open) => { setIsAddTaskOpen(open); if (!open) setTaskForm(EMPTY_TASK_FORM); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>
              Task will be added to &ldquo;{selectedProject?.title}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-task-title">Title</Label>
              <Input
                id="add-task-title"
                placeholder="e.g. Photograph the north façade"
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-task-description">Description (optional)</Label>
              <Textarea
                id="add-task-description"
                placeholder="Any important context?"
                rows={3}
                value={taskForm.description}
                onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="add-task-due">Due date (optional)</Label>
                <Input
                  id="add-task-due"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-task-assigned">Assign to (optional)</Label>
                <Select
                  value={taskForm.assigned_to}
                  onValueChange={(v) => setTaskForm((f) => ({ ...f, assigned_to: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger id="add-task-assigned">
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
            <div className="space-y-2">
              <Label htmlFor="add-task-visibility">Visibility</Label>
              <Select
                value={taskForm.visibility}
                onValueChange={(v: TaskVisibility) => setTaskForm((f) => ({ ...f, visibility: v }))}
              >
                <SelectTrigger id="add-task-visibility">
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
                        <Users className="h-3.5 w-3.5" /> Leadership only
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createTaskMutation.mutate()}
              disabled={createTaskMutation.isPending || !taskForm.title.trim()}
            >
              {createTaskMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Task dialog ── */}
      <Dialog
        open={isEditTaskOpen}
        onOpenChange={(open) => { setIsEditTaskOpen(open); if (!open) { setEditingTask(null); setEditTaskForm(EMPTY_TASK_FORM); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the details for this task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-task-title">Title</Label>
              <Input
                id="edit-task-title"
                value={editTaskForm.title}
                onChange={(e) => setEditTaskForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-task-description">Description (optional)</Label>
              <Textarea
                id="edit-task-description"
                rows={3}
                value={editTaskForm.description}
                onChange={(e) => setEditTaskForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-task-due">Due date (optional)</Label>
                <Input
                  id="edit-task-due"
                  type="date"
                  value={editTaskForm.due_date}
                  onChange={(e) => setEditTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-assigned">Assign to (optional)</Label>
                <Select
                  value={editTaskForm.assigned_to || "__none__"}
                  onValueChange={(v) => setEditTaskForm((f) => ({ ...f, assigned_to: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger id="edit-task-assigned">
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
            <div className="space-y-2">
              <Label htmlFor="edit-task-visibility">Visibility</Label>
              <Select
                value={editTaskForm.visibility}
                onValueChange={(v: TaskVisibility) => setEditTaskForm((f) => ({ ...f, visibility: v }))}
              >
                <SelectTrigger id="edit-task-visibility">
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
                        <Users className="h-3.5 w-3.5" /> Leadership only
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTaskOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateTaskMutation.mutate()}
              disabled={updateTaskMutation.isPending || !editTaskForm.title.trim()}
            >
              {updateTaskMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leader: create / edit published project */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetLeaderForm(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create Project"}</DialogTitle>
            <DialogDescription>
              This will be visible to all members of your chapter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Audit all Brutalist buildings in South London"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What needs to be done? Who should get involved?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v: "planning" | "active" | "completed" | "archived") => setStatus(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !title.trim()}
            >
              {saveMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : (editingProject ? "Update" : "Create Project")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ambassador: submit idea dialog */}
      <Dialog
        open={isIdeaOpen}
        onOpenChange={(open) => { setIsIdeaOpen(open); if (!open) { setIdeaTitle(""); setIdeaDescription(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit a Project Idea</DialogTitle>
            <DialogDescription>
              Your idea will be sent to your chapter&rsquo;s president and executive committee as a draft. They can publish, edit, or decline it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="idea-title">Idea title</Label>
              <Input
                id="idea-title"
                placeholder="e.g. Map all Art Deco cinemas in the city centre"
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idea-description">Details (optional)</Label>
              <Textarea
                id="idea-description"
                placeholder="Why does this matter? What would it involve? Who might want to help?"
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIdeaOpen(false)}>Cancel</Button>
            <Button
              onClick={() => submitIdeaMutation.mutate()}
              disabled={submitIdeaMutation.isPending || !ideaTitle.trim()}
            >
              {submitIdeaMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : "Submit Idea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DrawerTaskRow — lightweight task row inside the project detail Sheet
// ─────────────────────────────────────────────────────────────────────────────

function DrawerTaskRow({
  task,
  canEdit,
  onStatusCycle,
  onEdit,
  isCycling,
}: {
  task: ChapterTask;
  canEdit: boolean;
  onStatusCycle: () => void;
  onEdit: () => void;
  isCycling: boolean;
}) {
  const cfg = TASK_STATUS_CONFIG[task.status];

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border border-border-default bg-surface-card",
        task.status === "done" && "opacity-60",
      )}
    >
      <button
        onClick={onStatusCycle}
        disabled={isCycling || !canEdit}
        className={cn(
          "mt-0.5 shrink-0 transition-colors",
          cfg.class,
          canEdit && "hover:text-brand-primary cursor-pointer",
          !canEdit && "cursor-default",
        )}
        title={canEdit ? `Mark as ${TASK_STATUS_CONFIG[NEXT_STATUS[task.status]].label}` : cfg.label}
      >
        {isCycling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : cfg.icon}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium leading-snug", task.status === "done" && "line-through")}>
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {task.due_date && (
            <span className={cn("flex items-center gap-1 text-xs", dueDateClass(task.due_date))}>
              <CalendarDays className="h-3 w-3" />
              {format(parseISO(task.due_date), "d MMM yyyy")}
            </span>
          )}
          {task.assignee_username && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Avatar className="h-4 w-4">
                <AvatarImage src={task.assignee_avatar_url ?? undefined} />
                <AvatarFallback className="text-[8px] bg-muted">
                  {taskInitials(task.assignee_username)}
                </AvatarFallback>
              </Avatar>
              <span>@{task.assignee_username}</span>
            </span>
          )}
        </div>
      </div>

      {canEdit && (
        <button
          onClick={onEdit}
          className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          title="Edit task"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DraftCard
// ─────────────────────────────────────────────────────────────────────────────

function DraftCard({
  project,
  onPublish,
  onEdit,
  onDelete,
  isPublishing,
}: {
  project: Project;
  onPublish: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: () => void;
  isPublishing: boolean;
}) {
  return (
    <Card className="flex flex-col p-6 border border-dashed bg-muted/30 relative">
      <div className="flex items-start justify-between mb-4">
        <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border-amber-200">
          <Lightbulb className="h-3 w-3" />
          Draft idea
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <h3 className="text-xl font-bold mb-2">{project.title}</h3>
      {project.description && (
        <p className="text-sm text-muted-foreground line-clamp-4 flex-1 mb-6 leading-relaxed">
          {project.description}
        </p>
      )}

      <div className="mt-auto pt-4 border-t border-border-default space-y-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Submitted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
          {project.author_username ? ` · @${project.author_username}` : ""}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onPublish}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Publish
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectCard — clickable card that opens the detail drawer
// ─────────────────────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  taskCount,
  isLeader,
  onOpen,
  onEdit,
  onDelete,
}: {
  project: Project;
  taskCount: number;
  isLeader: boolean;
  onOpen: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const config = PROJECT_STATUS_CONFIG[project.status];

  return (
    <Card
      className="flex flex-col p-6 hover:shadow-md transition-all group relative cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between mb-4">
        <Badge variant="outline" className={cn("gap-1 px-2 py-0.5 capitalize font-medium", config.class)}>
          {config.icon}
          {project.status}
        </Badge>
        {isLeader && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              title="Edit project"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Remove project"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold mb-2 group-hover:text-brand-primary transition-colors">
        {project.title}
      </h3>
      {project.description && (
        <p className="text-sm text-muted-foreground line-clamp-4 flex-1 mb-6 leading-relaxed">
          {project.description}
        </p>
      )}

      <div className="mt-auto pt-4 border-t border-border-default flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
        </p>
        {taskCount > 0 && (
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>
    </Card>
  );
}
