import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const meta: MetaFunction = () => [
  { title: "Ambassador applications | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

type ApplicationRow = Database["public"]["Tables"]["ambassador_applications"]["Row"];
type ChapterRow = Database["public"]["Tables"]["ambassador_chapters"]["Row"];

type ApplicationListRow = ApplicationRow & {
  applicant: { id: string; username: string | null; avatar_url: string | null } | null;
  chapter: Pick<ChapterRow, "id" | "name" | "country_code" | "type"> | null;
};

export default function AmbassadorApplications() {
  const [rows, setRows] = useState<ApplicationListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [chapterFilter, setChapterFilter] = useState<string>("all");
  const [chapters, setChapters] = useState<Pick<ChapterRow, "id" | "name">[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ApplicationListRow | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadChapters = useCallback(async () => {
    const { data, error } = await supabase
      .from("ambassador_chapters")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) return;
    setChapters(data ?? []);
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ambassador_applications")
        .select(
          `
          *,
          applicant:profiles!ambassador_applications_user_id_fkey(id, username, avatar_url),
          chapter:ambassador_chapters(id, name, country_code, type)
        `,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as ApplicationListRow[]);
    } catch {
      toast.error("Failed to load applications");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChapters();
  }, [loadChapters]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (chapterFilter !== "all" && r.chapter_id !== chapterFilter) return false;
      return true;
    });
  }, [rows, statusFilter, chapterFilter]);

  const handleApprove = async (app: ApplicationListRow) => {
    setActionId(app.id);
    try {
      const { error } = await supabase.rpc("review_ambassador_application", {
        p_application_id: app.id,
        p_approve: true,
        p_reviewer_note: null,
      });
      if (error) throw error;
      toast.success("Approved");
      await loadApplications();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "";
      if (msg.includes("chapter_full")) {
        toast.error("Chapter is at ambassador capacity");
      } else {
        toast.error("Approve failed");
      }
    } finally {
      setActionId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionId(rejectTarget.id);
    try {
      const { error } = await supabase.rpc("review_ambassador_application", {
        p_application_id: rejectTarget.id,
        p_approve: false,
        p_reviewer_note: rejectNote.trim() || null,
      });
      if (error) throw error;
      toast.success("Rejected");
      setRejectOpen(false);
      setRejectTarget(null);
      await loadApplications();
    } catch {
      toast.error("Reject failed");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/ambassadors" className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Chapters
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Ambassador applications</h1>
        <p className="text-sm text-text-secondary mt-1">Review and filter applications across all chapters.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="w-40">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select value={chapterFilter} onValueChange={setChapterFilter}>
            <SelectTrigger aria-label="Filter by chapter">
              <SelectValue placeholder="Chapter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All chapters</SelectItem>
              {chapters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-text-disabled" aria-hidden />
        </div>
      ) : (
        <div className="rounded-md border border-border-default overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-text-secondary text-center py-8">
                    No applications match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">@{app.applicant?.username ?? "—"}</TableCell>
                    <TableCell>
                      {app.chapter ? (
                        <Link
                          to={`/admin/ambassadors/${app.chapter.id}`}
                          className="text-text-primary underline-offset-2 hover:underline"
                        >
                          {app.chapter.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.status === "pending" ? "default" : "secondary"}>{app.status}</Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      {app.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleApprove(app)}
                            disabled={actionId === app.id}
                          >
                            {actionId === app.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              "Approve"
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectTarget(app);
                              setRejectNote("");
                              setRejectOpen(true);
                            }}
                            disabled={actionId === app.id}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-text-disabled text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-reject-note">Optional note</Label>
            <Textarea
              id="admin-reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              className="resize-y min-h-[96px]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRejectConfirm()}
              disabled={!rejectTarget || actionId === rejectTarget?.id}
            >
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
