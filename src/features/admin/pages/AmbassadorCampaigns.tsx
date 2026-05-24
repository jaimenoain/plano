import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Inbox, Lightbulb, Loader2, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { format, formatDistanceToNow, parseISO, isAfter, isBefore } from "date-fns";
import type { MetaFunction } from "react-router";
import {
  AdminPageHeader,
  AdminSectionLabel,
  AdminFormLabel,
  AdminEmptyState,
  AdminErrorState,
  adminTableHeadClass,
} from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [
  { title: "Programme campaigns | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  metric_type: "photos" | "edits" | "outreach";
  target_value: number;
  chapter_scope: "all" | "specific";
  created_by: string;
  created_at: string;
};

type DraftIdea = {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  chapter_name: string | null;
  author_username: string | null;
};

type FormState = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  metric_type: "photos" | "edits" | "outreach";
  target_value: number;
  chapter_scope: "all" | "specific";
};

function campaignStatus(c: Campaign): "upcoming" | "active" | "ended" {
  const now = new Date();
  const start = parseISO(c.start_date);
  const end = parseISO(c.end_date);
  if (isBefore(now, start)) return "upcoming";
  if (isAfter(now, end)) return "ended";
  return "active";
}

async function fetchProgress(campaign: Campaign): Promise<number> {
  const { start_date, end_date, metric_type } = campaign;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  if (metric_type === "photos") {
    const { count, error } = await db
      .from("review_images")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start_date)
      .lte("created_at", end_date + "T23:59:59Z");
    if (error) return 0;
    return count ?? 0;
  }

  if (metric_type === "edits") {
    const { count, error } = await db
      .from("building_audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start_date)
      .lte("created_at", end_date + "T23:59:59Z");
    if (error) return 0;
    return count ?? 0;
  }

  // outreach
  const { count, error } = await db
    .from("outreach_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start_date)
    .lte("created_at", end_date + "T23:59:59Z");
  if (error) return 0;
  return count ?? 0;
}

export default function AmbassadorCampaigns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    metric_type: "photos",
    target_value: 100,
    chapter_scope: "all",
  });

  const { data: draftIdeas = [], isLoading: ideasLoading, isError: ideasError } = useQuery({
    queryKey: ["admin-draft-ideas"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      // 1. Fetch all draft rows. No FK-hint joins — chapter_projects.created_by
      //    references auth.users(id), not profiles(id), so `profiles!created_by`
      //    fails to resolve and silently drops rows.
      const { data: drafts, error: draftsError } = await db
        .from("chapter_projects")
        .select("id, chapter_id, title, description, created_by, created_at")
        .eq("status", "draft")
        .order("created_at", { ascending: false });
      if (draftsError) throw draftsError;

      const rows = (drafts ?? []) as Array<{
        id: string;
        chapter_id: string;
        title: string;
        description: string | null;
        created_by: string;
        created_at: string;
      }>;

      if (rows.length === 0) return [] as DraftIdea[];

      const chapterIds = Array.from(new Set(rows.map((r) => r.chapter_id)));
      const authorIds = Array.from(new Set(rows.map((r) => r.created_by)));

      const [chaptersRes, profilesRes] = await Promise.all([
        db.from("ambassador_chapters").select("id, name").in("id", chapterIds),
        db.from("profiles").select("id, username").in("id", authorIds),
      ]);

      const chapterMap = new Map<string, string>(
        ((chaptersRes.data ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]),
      );
      const profileMap = new Map<string, string>(
        ((profilesRes.data ?? []) as Array<{ id: string; username: string | null }>)
          .filter((p) => p.username)
          .map((p) => [p.id, p.username as string]),
      );

      return rows.map<DraftIdea>((r) => ({
        ...r,
        chapter_name: chapterMap.get(r.chapter_id) ?? null,
        author_username: profileMap.get(r.created_by) ?? null,
      }));
    },
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["programme-campaigns"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("programme_campaigns")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const { data: progressMap = {} } = useQuery({
    queryKey: ["programme-campaigns-progress", campaigns.map((c) => c.id).join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        campaigns.map(async (c) => [c.id, await fetchProgress(c)] as [string, number]),
      );
      return Object.fromEntries(entries);
    },
    enabled: campaigns.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("programme_campaigns").insert({
        title: form.title,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.end_date,
        metric_type: form.metric_type,
        target_value: form.target_value,
        chapter_scope: form.chapter_scope,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign created");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["programme-campaigns"] });
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const statusBadge = (c: Campaign) => {
    const s = campaignStatus(c);
    const variants = {
      active: "bg-feedback-success/10 text-feedback-success border-feedback-success/20",
      upcoming: "bg-surface-muted text-text-primary border-border-default",
      ended: "bg-surface-muted text-text-secondary border-border-default",
    };
    return (
      <Badge variant="outline" className={variants[s]}>
        {s}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Ambassadors"
        title="Programme campaigns"
        description="Coordinate all chapters with a single campaign. Appears automatically in every chapter's project board."
        actions={
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" aria-hidden />
            New campaign
          </Button>
        }
      />

      {/* Draft ideas submitted by ambassadors */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Inbox className="h-4 w-4 text-text-secondary shrink-0" aria-hidden />
          <AdminSectionLabel>Ambassador ideas inbox</AdminSectionLabel>
          {draftIdeas.length > 0 && (
            <Badge variant="secondary" className="text-xs">{draftIdeas.length}</Badge>
          )}
        </div>

        {ideasLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
          </div>
        ) : ideasError ? (
          <AdminErrorState message="Could not load ambassador ideas. Check the console for details." />
        ) : draftIdeas.length === 0 ? (
          <AdminEmptyState
            title="No pending ideas."
            description="Ambassadors can submit ideas from their chapter projects page."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {draftIdeas.map((idea) => (
              <Card key={idea.id} className="flex flex-col p-5 border border-dashed bg-surface-muted/50 border-border-default">
                <div className="mb-3">
                  <Badge
                    variant="outline"
                    className="gap-1 px-2 py-0.5 text-xs font-medium text-feedback-warning border-feedback-warning/30 bg-feedback-warning/10"
                  >
                    <Lightbulb className="h-3 w-3" />
                    Draft idea
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-text-primary mb-1">{idea.title}</h3>
                {idea.description && (
                  <p className="text-sm text-text-secondary line-clamp-3 mb-3 flex-1 leading-relaxed">
                    {idea.description}
                  </p>
                )}

                <div className="mt-auto pt-3 border-t border-border-default">
                  <div className="flex items-center justify-between text-2xs text-text-secondary">
                    <span>
                      {idea.chapter_name ?? "Unknown chapter"}
                      {idea.author_username ? ` · @${idea.author_username}` : ""}
                    </span>
                    <span>{formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Target className="h-4 w-4 text-text-secondary shrink-0" aria-hidden />
          <AdminSectionLabel>Programme campaigns</AdminSectionLabel>
        </div>
      <div className="rounded-lg border border-border-default bg-surface-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-text-disabled" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={adminTableHeadClass}>Campaign</TableHead>
                <TableHead className={adminTableHeadClass}>Metric</TableHead>
                <TableHead className={adminTableHeadClass}>Dates</TableHead>
                <TableHead className={adminTableHeadClass}>Scope</TableHead>
                <TableHead className={adminTableHeadClass}>Status</TableHead>
                <TableHead className={cn(adminTableHeadClass, "w-[200px]")}>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <AdminEmptyState
                      title="No campaigns yet."
                      description="Create one to coordinate all chapters."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => {
                  const progress = progressMap[c.id] ?? 0;
                  const pct = Math.min(100, Math.round((progress / c.target_value) * 100));
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium text-text-primary">{c.title}</div>
                        {c.description && (
                          <div className="text-xs text-text-secondary line-clamp-1">
                            {c.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{c.metric_type}</TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {format(parseISO(c.start_date), "d MMM")} –{" "}
                        {format(parseISO(c.end_date), "d MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.chapter_scope}</Badge>
                      </TableCell>
                      <TableCell>{statusBadge(c)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={pct} className="h-2" />
                          <p className="text-xs text-text-secondary">
                            {progress.toLocaleString()} / {c.target_value.toLocaleString()} (
                            {pct}%)
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New programme campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <AdminFormLabel htmlFor="camp-title">Title</AdminFormLabel>
              <Input
                id="camp-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Summer Photo Sprint 2027"
              />
            </div>
            <div className="space-y-2">
              <AdminFormLabel htmlFor="camp-desc">Description (optional)</AdminFormLabel>
              <Textarea
                id="camp-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What ambassadors need to know about this campaign"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <AdminFormLabel htmlFor="camp-start">Start date</AdminFormLabel>
                <Input
                  id="camp-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <AdminFormLabel htmlFor="camp-end">End date</AdminFormLabel>
                <Input
                  id="camp-end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <AdminFormLabel>Metric type</AdminFormLabel>
              <Select
                value={form.metric_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, metric_type: v as FormState["metric_type"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photos">Photos</SelectItem>
                  <SelectItem value="edits">Edits</SelectItem>
                  <SelectItem value="outreach">Outreach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <AdminFormLabel htmlFor="camp-target">Target value</AdminFormLabel>
              <Input
                id="camp-target"
                type="number"
                min={1}
                value={form.target_value}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    target_value: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <AdminFormLabel>Chapter scope</AdminFormLabel>
              <Select
                value={form.chapter_scope}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, chapter_scope: v as FormState["chapter_scope"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chapters</SelectItem>
                  <SelectItem value="specific">Specific chapters</SelectItem>
                </SelectContent>
              </Select>
              {form.chapter_scope === "specific" && (
                <p className="text-xs text-text-secondary">
                  Chapter selection available after creation — edit the campaign to assign chapters.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending || !form.title.trim()}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create campaign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
