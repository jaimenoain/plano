import { Fragment, useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import type { MetaFunction } from "react-router";
import { Columns, Loader2, Table2 } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  TYPE_COLORS,
  TYPE_LABELS,
  type DateRange,
  type FeedbackRow,
  type FeedbackType,
  type FeedbackViewMode,
} from "@/features/admin/feedback/feedbackTypes";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [{ title: "Admin Feedback | Plano" }];

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

export default function FeedbackAdminPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [viewMode, setViewMode] = useState<FeedbackViewMode>("table");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<FeedbackRow | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("feedback")
        .select(
          `id, type, message, page_url, user_agent, console_errors, metadata, screenshot_path, created_at, user_id,
           profiles ( username )`,
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        setLoadError(error.message);
      } else {
        setRows((data ?? []) as unknown as FeedbackRow[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const now = Date.now();
  const filtered = rows.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (dateRange === "7d" && now - new Date(r.created_at).getTime() > 7 * 86_400_000)
      return false;
    if (dateRange === "30d" && now - new Date(r.created_at).getTime() > 30 * 86_400_000)
      return false;
    return true;
  });

  async function handleViewScreenshot(screenshotPath: string) {
    setSigningUrl("loading");
    const { data, error } = await supabase.storage
      .from("feedback-screenshots")
      .createSignedUrl(screenshotPath, 60);
    if (error || !data) {
      void error;
      setSigningUrl(null);
      return;
    }
    window.open(data.signedUrl, "_blank");
    setSigningUrl(null);
  }

  function openDetail(row: FeedbackRow) {
    if (viewMode === "kanban") {
      setSelectedRow(row);
    } else {
      setExpandedId(expandedId === row.id ? null : row.id);
    }
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-primary">Feedback</h1>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as FeedbackViewMode)}
        >
          <ToggleGroupItem value="table" size="sm" aria-label="Table view">
            <Table2 className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" size="sm" aria-label="Kanban view">
            <Columns className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          {FEEDBACK_TYPES.map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
            >
              {TYPE_LABELS[t]}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {(["7d", "30d", "all"] as DateRange[]).map((d) => (
            <Button
              key={d}
              variant={dateRange === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(d)}
            >
              {d === "7d" ? "Last 7 days" : d === "30d" ? "Last 30 days" : "All time"}
            </Button>
          ))}
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
          typeFilter={typeFilter}
          onSelectRow={(row) => setSelectedRow(row)}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-text-secondary">
                  No feedback yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-surface-muted"
                    onClick={() => openDetail(row)}
                  >
                    <TableCell>
                      <TypePill type={row.type} />
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {row.profiles?.username ?? row.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-text-primary">
                      <span title={row.message}>
                        {row.message.length > 80
                          ? `${row.message.slice(0, 80)}…`
                          : row.message}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-text-secondary">
                      {row.page_url ? (
                        <a
                          href={row.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.page_url}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-text-secondary">
                      {formatDistanceToNow(new Date(row.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>

                  {expandedId === row.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-surface-muted px-5 py-4">
                        <FeedbackDetailContent
                          row={row}
                          signingUrl={signingUrl}
                          onViewScreenshot={handleViewScreenshot}
                        />
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
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selectedRow && (
            <>
              <SheetHeader className="space-y-3 text-left">
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  <TypePill type={selectedRow.type} />
                </SheetTitle>
                <SheetDescription asChild>
                  <div className="space-y-1 text-sm text-text-secondary">
                    <p>
                      <span className="font-medium text-text-primary">User: </span>
                      {selectedRow.profiles?.username ?? selectedRow.user_id.slice(0, 8)}
                    </p>
                    <p>
                      <span className="font-medium text-text-primary">Submitted: </span>
                      {formatDistanceToNow(new Date(selectedRow.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {selectedRow.page_url && (
                      <p>
                        <span className="font-medium text-text-primary">Page: </span>
                        <a
                          href={selectedRow.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all hover:underline"
                        >
                          {selectedRow.page_url}
                        </a>
                      </p>
                    )}
                  </div>
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FeedbackDetailContent
                  row={selectedRow}
                  signingUrl={signingUrl}
                  onViewScreenshot={handleViewScreenshot}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
