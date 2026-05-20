import { useRef, useState, type DragEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLUMN_DOT,
  KANBAN_STATUSES,
  STATUS_OPTIONS,
  TYPE_COLORS,
  TYPE_LABELS_SHORT,
  type FeedbackRow,
  type FeedbackStatus,
} from "@/features/admin/feedback/feedbackTypes";

interface FeedbackKanbanViewProps {
  rows: FeedbackRow[];
  readOnly: boolean;
  onSelectRow: (row: FeedbackRow) => void;
  onStatusChange: (row: FeedbackRow, status: FeedbackStatus) => void;
}

function formatUsername(row: FeedbackRow): string {
  return row.profiles?.username ?? row.user_id.slice(0, 8);
}

export function FeedbackKanbanView({
  rows,
  readOnly,
  onSelectRow,
  onStatusChange,
}: FeedbackKanbanViewProps) {
  const [dragOverCol, setDragOverCol] = useState<FeedbackStatus | null>(null);
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);

  const byStatus = STATUS_OPTIONS.reduce<Record<FeedbackStatus, FeedbackRow[]>>(
    (acc, { value }) => {
      acc[value] = rows.filter((r) => r.status === value);
      return acc;
    },
    {} as Record<FeedbackStatus, FeedbackRow[]>,
  );

  const duplicateCount = byStatus.duplicate?.length ?? 0;

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-sm border border-border-default py-16 text-text-secondary">
        No feedback yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border-default [scrollbar-width:thin]">
      <div className="sticky top-0 z-10 flex min-w-max border-b border-border-default bg-surface-card">
        {KANBAN_STATUSES.map(({ value, label }, i) => (
          <div
            key={value}
            className={cn(
              "flex w-[260px] shrink-0 items-center justify-between px-4 py-3",
              i < KANBAN_STATUSES.length - 1 && "border-r border-border-default",
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("inline-block h-2 w-2 rounded-full", COLUMN_DOT[value])} />
              <span className="text-xs font-semibold text-text-secondary">{label}</span>
            </div>
            <span className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">
              {byStatus[value].length}
            </span>
          </div>
        ))}
        {duplicateCount > 0 && (
          <div className="flex w-[140px] shrink-0 items-center gap-2 border-l border-border-default px-4 py-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-feedback-destructive/30 bg-feedback-destructive/10 px-2 py-0.5 text-xs font-semibold text-feedback-destructive">
              Duplicate
            </span>
            <span className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">
              {duplicateCount}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-max pb-4">
        {KANBAN_STATUSES.map(({ value }, i) => {
          const cards = byStatus[value];
          const isDropTarget = dragOverCol === value;

          return (
            <div
              key={value}
              className={cn(
                "flex w-[260px] shrink-0 flex-col pt-3 transition-colors",
                i < KANBAN_STATUSES.length - 1 && "border-r border-border-default",
                isDropTarget ? "bg-brand-primary/5" : "bg-surface-muted/30",
              )}
              onDragOver={
                readOnly
                  ? undefined
                  : (e: DragEvent) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverCol(value);
                    }
              }
              onDragLeave={
                readOnly
                  ? undefined
                  : (e: DragEvent) => {
                      if (
                        !e.relatedTarget ||
                        !e.currentTarget.contains(e.relatedTarget as Node)
                      ) {
                        setDragOverCol(null);
                      }
                    }
              }
              onDrop={
                readOnly
                  ? undefined
                  : (e: DragEvent) => {
                      e.preventDefault();
                      const id = draggingIdRef.current;
                      if (id) {
                        const row = rows.find((r) => r.id === id);
                        if (row && row.status !== value) {
                          onStatusChange(row, value);
                        }
                      }
                      draggingIdRef.current = null;
                      setDraggingRowId(null);
                      setDragOverCol(null);
                    }
              }
            >
              <div className={cn("mx-3 mb-3 h-0.5 rounded-full", COLUMN_DOT[value])} />
              <div className="flex min-h-[80px] flex-col gap-2 px-3">
                {cards.length === 0 ? (
                  <div
                    className={cn(
                      "flex min-h-[100px] items-center justify-center rounded-sm border border-dashed text-xs",
                      isDropTarget
                        ? "border-brand-primary/40 text-brand-primary"
                        : "border-border-default text-text-disabled",
                    )}
                  >
                    {isDropTarget ? "Drop here" : "No items"}
                  </div>
                ) : (
                  cards.map((row) => (
                    <div
                      key={row.id}
                      draggable={!readOnly}
                      onDragStart={
                        readOnly
                          ? undefined
                          : (e: DragEvent) => {
                              draggingIdRef.current = row.id;
                              setDraggingRowId(row.id);
                              e.dataTransfer.effectAllowed = "move";
                            }
                      }
                      onDragEnd={
                        readOnly
                          ? undefined
                          : () => {
                              draggingIdRef.current = null;
                              setDraggingRowId(null);
                              setDragOverCol(null);
                            }
                      }
                      className={cn(
                        !readOnly && "cursor-grab active:cursor-grabbing",
                        draggingRowId === row.id && "opacity-40",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectRow(row)}
                        className="w-full rounded-sm border border-border-default bg-surface-card p-3 text-left transition-colors hover:border-border-strong hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-2xs font-medium",
                              TYPE_COLORS[row.type],
                            )}
                          >
                            {TYPE_LABELS_SHORT[row.type]}
                          </span>
                          <div className="flex items-center gap-1">
                            {row.needs_user_input && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-2xs font-semibold text-amber-800">
                                Needs input
                              </span>
                            )}
                            {row.screenshot_path && (
                              <Camera
                                className="h-3.5 w-3.5 text-text-disabled"
                                aria-label="Has screenshot"
                              />
                            )}
                          </div>
                        </div>
                        <p className="line-clamp-3 text-sm text-text-secondary">{row.message}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="truncate text-2xs text-text-disabled">
                            {formatUsername(row)}
                          </span>
                          <span className="shrink-0 text-2xs text-text-disabled">
                            {formatDistanceToNow(new Date(row.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
