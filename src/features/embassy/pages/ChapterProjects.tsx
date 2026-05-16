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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pin, CheckCircle2, Archive, Loader2, AlertCircle, Trash2, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, parseISO } from "date-fns";

type Project = {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "archived";
  created_by: string;
  created_at: string;
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

async function fetchCampaignProgress(
  campaign: Campaign,
  chapterId: string,
): Promise<number> {
  const { start_date, end_date, metric_type } = campaign;
  const endTs = end_date + "T23:59:59Z";

  if (metric_type === "photos") {
    // Count photos by members of this chapter
    const { data: memberIds } = await supabase
      .from("ambassador_memberships")
      .select("user_id")
      .eq("chapter_id", chapterId)
      .eq("status", "active");
    if (!memberIds?.length) return 0;
    const ids = memberIds.map((m) => m.user_id);
    const { count } = await supabase
      .from("review_images")
      .select("id", { count: "exact", head: true })
      .in("user_id", ids)
      .gte("created_at", start_date)
      .lte("created_at", endTs);
    return count ?? 0;
  }

  if (metric_type === "edits") {
    const { data: memberIds } = await supabase
      .from("ambassador_memberships")
      .select("user_id")
      .eq("chapter_id", chapterId)
      .eq("status", "active");
    if (!memberIds?.length) return 0;
    const ids = memberIds.map((m) => m.user_id);
    const { count } = await supabase
      .from("building_audit_logs")
      .select("id", { count: "exact", head: true })
      .in("user_id", ids)
      .gte("created_at", start_date)
      .lte("created_at", endTs);
    return count ?? 0;
  }

  // outreach
  const { data: memberMemberships } = await supabase
    .from("ambassador_memberships")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("status", "active");
  if (!memberMemberships?.length) return 0;
  const membershipIds = memberMemberships.map((m) => m.id);
  const { count } = await supabase
    .from("outreach_log")
    .select("id", { count: "exact", head: true })
    .in("ambassador_id", membershipIds)
    .gte("created_at", start_date)
    .lte("created_at", endTs);
  return count ?? 0;
}

export default function ChapterProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "completed" | "archived">("active");

  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select("chapter_id, role")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isLeader = membership?.role === "exco" || membership?.role === "president";
  const chapterId = membership?.chapter_id;

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["chapter-projects", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_projects")
        .select("*")
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!chapterId,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["programme-campaigns-portal", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (editingProject) {
        const { error } = await supabase
          .from("chapter_projects")
          .update({ title, description, status, updated_at: new Date().toISOString() })
          .eq("id", editingProject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
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
      toast.success(editingProject ? "Project updated" : "Project pinned");
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["chapter-projects", chapterId] });
    },
    onError: () => {
      toast.error("Failed to save project. Check if the chapter_projects table exists.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapter_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project removed");
      queryClient.invalidateQueries({ queryKey: ["chapter-projects", chapterId] });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("active");
    setEditingProject(null);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setTitle(project.title);
    setDescription(project.description || "");
    setStatus(project.status);
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Chapter Projects</h1>
          <p className="text-muted-foreground">Priority initiatives and goals for your chapter.</p>
        </div>
        {isLeader && (
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Pin Project
          </Button>
        )}
      </div>

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
      ) : projects?.length === 0 ? (
        <div className="p-20 text-center border border-dashed rounded-xl space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Pin className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-medium">No projects yet</p>
            <p className="text-muted-foreground">Pin priorities here to coordinate with your chapter members.</p>
          </div>
          {isLeader && (
            <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Create the first project</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              isLeader={isLeader} 
              onEdit={() => openEdit(project)}
              onDelete={() => { if(confirm("Remove this project?")) deleteMutation.mutate(project.id); }}
            />
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Pin a New Priority"}</DialogTitle>
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
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              onClick={() => createMutation.mutate()} 
              disabled={createMutation.isPending || !title.trim()}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingProject ? "Update" : "Pin Project")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectCard({ project, isLeader, onEdit, onDelete }: { 
  project: Project; 
  isLeader: boolean; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusConfig = {
    active: { icon: <Pin className="h-3 w-3" />, class: "bg-brand-primary/10 text-brand-primary border-brand-primary/20" },
    completed: { icon: <CheckCircle2 className="h-3 w-3" />, class: "bg-green-500/10 text-green-600 border-green-500/20" },
    archived: { icon: <Archive className="h-3 w-3" />, class: "bg-muted text-muted-foreground border-border-default" }
  };

  const config = statusConfig[project.status];

  return (
    <Card className="flex flex-col p-6 hover:shadow-md transition-all group relative">
      <div className="flex items-start justify-between mb-4">
        <Badge variant="outline" className={cn("gap-1 px-2 py-0.5 capitalize font-medium", config.class)}>
          {config.icon}
          {project.status}
        </Badge>
        {isLeader && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <h3 className="text-xl font-bold mb-2 group-hover:text-brand-primary transition-colors">{project.title}</h3>
      {project.description && (
        <p className="text-sm text-muted-foreground line-clamp-4 flex-1 mb-6 leading-relaxed">
          {project.description}
        </p>
      )}
      
      <div className="mt-auto pt-4 border-t border-border-default flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Pinned {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
        </p>
      </div>
    </Card>
  );
}
