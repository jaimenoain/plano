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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Loader2, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import type { MetaFunction } from "react-router";

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

  if (metric_type === "photos") {
    const { count, error } = await supabase
      .from("review_images")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start_date)
      .lte("created_at", end_date + "T23:59:59Z");
    if (error) return 0;
    return count ?? 0;
  }

  if (metric_type === "edits") {
    const { count, error } = await supabase
      .from("building_audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start_date)
      .lte("created_at", end_date + "T23:59:59Z");
    if (error) return 0;
    return count ?? 0;
  }

  // outreach
  const { count, error } = await supabase
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

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["programme-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
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
      const { error } = await supabase.from("programme_campaigns").insert({
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
      active: "bg-green-500/10 text-green-700 border-green-500/20",
      upcoming: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      ended: "bg-muted text-muted-foreground border-border-default",
    };
    return (
      <Badge variant="outline" className={variants[s]}>
        {s}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-text-secondary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">
              Programme campaigns
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Coordinate all chapters with a single campaign. Appears automatically in every
              chapter's project board.
            </p>
          </div>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" aria-hidden />
          New campaign
        </Button>
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
                <TableHead>Campaign</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[200px]">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-text-secondary py-12">
                    No campaigns yet. Create one to coordinate all chapters.
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New programme campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="camp-title">Title</Label>
              <Input
                id="camp-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Summer Photo Sprint 2027"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-desc">Description (optional)</Label>
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
                <Label htmlFor="camp-start">Start date</Label>
                <Input
                  id="camp-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camp-end">End date</Label>
                <Input
                  id="camp-end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Metric type</Label>
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
              <Label htmlFor="camp-target">Target value</Label>
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
              <Label>Chapter scope</Label>
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
