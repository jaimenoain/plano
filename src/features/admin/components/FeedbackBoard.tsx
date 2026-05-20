import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { LayoutGrid, List, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  loadFeedbackForAdmin,
  loadFeedbackForTeam,
  reopenFeedback,
  updateFeedback,
} from "@/features/feedback/services/feedbackService";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FeedbackDetailContent } from "@/features/admin/components/FeedbackDetailContent";
import { FeedbackKanbanView } from "@/features/admin/components/FeedbackKanbanView";
import {
  FEEDBACK_TYPES,
  STATUS_COLORS,
  STATUS_OPTIONS,
  TYPE_COLORS,
  TYPE_LABELS,
  type DateRange,
  type FeedbackRow,
  type FeedbackStatus,
  type FeedbackType,
  type FeedbackViewMode,
} from "@/features/admin/feedback/feedbackTypes";
import { cn } from "@/lib/utils";

function TypePill({ type }: { type: FeedbackType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TYPE_COLORS[type],
      )}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

function formatUsername(row: FeedbackRow): string {
  return row.profiles?.username ?? row.user_id.slice(0, 8);
}

const DATE_RANGE_OPTIONS_LOCAL: { label: string; value: DateRange }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "All time", value: "all" },
];

interface FeedbackBoardProps {
  readOnly?: boolean;
}

export function FeedbackBoard({ readOnly = false }: FeedbackBoardProps) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialOpenId = searchParams.get("open");

  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<FeedbackViewMode>("kanban");
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus[]>([]);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(initialOpenId);
  const [selectedRow, setSelectedRow] = useState<FeedbackRow | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reopenTarget, setReopenTarget] = useState<FeedbackRow | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [submittingReopen, setSubmittingReopen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = readOnly ? await loadFeedbackForTeam() : await loadFeedbackForAdmin();
    if (result.error) setLoadError(result.error);
    else setRows(result.rows);
    setLoading(false);
  }, [readOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!initialOpenId || rows.length === 0) return;
    const row = rows.find((r) => r.id === initialOpenId);
    if (!row) return;
    if (viewMode === "kanban") setSelectedRow(row);
    else setExpandedId(initialOpenId);
  }, [initialOpenId, rows, viewMode]);

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const key = r.user_id;
      if (!map.has(key)) map.set(key, formatUsername(r));
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const cutoff =
    dateRange === "7d"
      ? Date.now() - 7 * 86_400_000
      : dateRange === "30d"
        ? Date.now() - 30 * 86_400_000
        : null;

  const filtered = rows.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(r.status)) return false;
    if (userFilter !== "all" && r.user_id !== userFilter) return false;
    if (cutoff && new Date(r.created_at).getTime() < cutoff) return false;
    return true;
  });

  function patchRow(id: string, patch: Partial<FeedbackRow>) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...patch,
              ...(patch.status !== undefined
                ? { status_changed_at: new Date().toISOString() }
                : {}),
            }
          : r,
      ),
    );
    setSelectedRow((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  async function handleViewScreenshot(screenshotPath: string) {
    setSigningUrl("loading");
    const { data, error } = await supabase.storage
      .from("feedback-screenshots")
      .createSignedUrl(screenshotPath, 60);
    if (error || !data) {
      setSigningUrl(null);
      return;
    }
    window.open(data.signedUrl, "_blank");
    setSigningUrl(null);
  }

  async function handleStatusChange(row: FeedbackRow, status: FeedbackStatus) {
    if (readOnly || !user) return;
    patchRow(row.id, { status });
    setSavingId(row.id);
    const { error } = await updateFeedback(row.id, user.id, { status });
    setSavingId(null);
    if (error) void load();
  }

  async function handleNotesBlur(row: FeedbackRow, notes: string) {
    if (readOnly || !user) return;
    const trimmed = notes.trim() || null;
    if (trimmed === row.outcome_notes) return;
    patchRow(row.id, { outcome_notes: trimmed });
    setSavingId(row.id);
    const { error } = await updateFeedback(row.id, user.id, { outcome_notes: trimmed });
    setSavingId(null);
    if (error) void load();
  }

  async function handleNeedsUserInputToggle(row: FeedbackRow) {
    if (readOnly || !user) return;
    const next = !row.needs_user_input;
    patchRow(row.id, { needs_user_input: next });
    setSavingId(row.id);
    const { error } = await updateFeedback(row.id, user.id, { needs_user_input: next });
    setSavingId(null);
    if (error) void load();
  }

  async function submitReopen() {
    if (!reopenTarget || submittingReopen) return;
    const trimmed = reopenReason.trim();
    if (trimmed.length < 5) {
      setReopenError("Please add at least 5 characters explaining why you are reopening.");
      return;
    }
    setSubmittingReopen(true);
    setReopenError(null);
    const target = reopenTarget;
    const dateLabel = new Date().toISOString().slice(0, 10);
    const reopenBlock = `— Reopened by user on ${dateLabel}:\n${trimmed}`;
    const nextNotes = target.outcome_notes
      ? `${target.outcome_notes.trimEnd()}\n\n${reopenBlock}`
      : reopenBlock;

    const { error } = await reopenFeedback(target.id, trimmed);
    setSubmittingReopen(false);
    if (error) {
      setReopenError(error);
      return;
    }
    patchRow(target.id, { status: "open", outcome_notes: nextNotes });
    setReopenTarget(null);
  }

  const detailProps = {
    readOnly,
    savingId,
    signingUrl,
    onViewScreenshot: handleViewScreenshot,
    onStatusChange: handleStatusChange,
    onNotesBlur: handleNotesBlur,
    onNeedsUserInputToggle: handleNeedsUserInputToggle,
    onReopen: setReopenTarget,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as FeedbackViewMode)}
        >
          <ToggleGroupItem value="kanban" size="sm" aria-label="Board view">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="ml-1 hidden sm:inline">Board</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="table" size="sm" aria-label="Table view">
            <List className="h-3.5 w-3.5" />
            <span className="ml-1 hidden sm:inline">List</span>
          </ToggleGroupItem>
        </ToggleGroup>

        {viewMode === "table" && (
          <Select
            value={statusFilter.length === 1 ? statusFilter[0] : "all"}
            onValueChange={(v) => setStatusFilter(v === "all" || !v ? [] : [v as FeedbackStatus])}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {uniqueUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter((v ?? "all") as FeedbackType | "all")}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {FEEDBACK_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={(v) => setDateRange((v ?? "all") as DateRange)}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS_LOCAL.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : loadError ? (
        <div className="rounded-md border border-feedback-destructive/30 bg-feedback-destructive/10 p-4 text-sm text-feedback-destructive">
          Failed to load feedback: {loadError}
        </div>
      ) : viewMode === "kanban" ? (
        <FeedbackKanbanView
          rows={filtered}
          readOnly={readOnly}
          onSelectRow={setSelectedRow}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>User</TableHead>
              {readOnly ? (
                <>
                  <TableHead>Message</TableHead>
                  <TableHead>Outcome</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Message</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Submitted</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 5 : 6}
                  className="py-12 text-center text-text-secondary"
                >
                  No feedback yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-surface-muted"
                    onClick={() =>
                      setExpandedId(expandedId === row.id ? null : row.id)
                    }
                  >
                    <TableCell>
                      <TypePill type={row.type} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                          STATUS_COLORS[row.status],
                        )}
                      >
                        {STATUS_OPTIONS.find((o) => o.value === row.status)?.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      <div>{formatUsername(row)}</div>
                      {readOnly && (
                        <div className="text-2xs text-text-disabled">
                          Submitted{" "}
                          {formatDistanceToNow(new Date(row.created_at), {
                            addSuffix: true,
                          })}
                        </div>
                      )}
                    </TableCell>
                    {readOnly ? (
                      <>
                        <TableCell className="max-w-xs text-sm">
                          {row.message.length > 80
                            ? `${row.message.slice(0, 80)}…`
                            : row.message}
                        </TableCell>
                        <TableCell className="max-w-xs text-sm text-text-secondary">
                          {row.outcome_notes
                            ? row.outcome_notes.length > 80
                              ? `${row.outcome_notes.slice(0, 80)}…`
                              : row.outcome_notes
                            : "—"}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="max-w-xs text-sm">{row.message}</TableCell>
                        <TableCell className="max-w-[160px] truncate text-xs">
                          {row.page_url ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-text-secondary">
                          {formatDistanceToNow(new Date(row.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                  {expandedId === row.id && (
                    <TableRow>
                      <TableCell
                        colSpan={readOnly ? 5 : 6}
                        className="bg-surface-muted px-5 py-4"
                      >
                        <FeedbackDetailContent row={row} {...detailProps} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Sheet
        open={selectedRow !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedRow && (
            <>
              <SheetHeader className="space-y-3 text-left">
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  <TypePill type={selectedRow.type} />
                  <span className="text-base font-medium text-text-primary">
                    {formatUsername(selectedRow)}
                  </span>
                </SheetTitle>
                <SheetDescription asChild>
                  <div className="text-sm text-text-secondary">
                    {formatDistanceToNow(new Date(selectedRow.created_at), {
                      addSuffix: true,
                    })}
                    {selectedRow.page_url && (
                      <p className="mt-1 break-all">{selectedRow.page_url}</p>
                    )}
                  </div>
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FeedbackDetailContent row={selectedRow} {...detailProps} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={reopenTarget !== null}
        onOpenChange={(open) => {
          if (!open && !submittingReopen) setReopenTarget(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reopen this feedback</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            Let the team know what is still not working. Your comment will be appended for
            reviewers.
          </p>
          <Textarea
            value={reopenReason}
            onChange={(e) => {
              setReopenReason(e.target.value);
              if (reopenError) setReopenError(null);
            }}
            rows={5}
            maxLength={2000}
            placeholder="What's still not resolved?"
            autoFocus
          />
          <div className="flex items-center justify-between text-xs">
            <span className={reopenError ? "text-feedback-destructive" : "text-text-disabled"}>
              {reopenError ?? "Minimum 5 characters."}
            </span>
            <span className="text-text-disabled">{reopenReason.trim().length} / 2000</span>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submittingReopen}
              onClick={() => setReopenTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submittingReopen || reopenReason.trim().length < 5}
              onClick={() => void submitReopen()}
            >
              {submittingReopen ? "Reopening…" : "Reopen feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
