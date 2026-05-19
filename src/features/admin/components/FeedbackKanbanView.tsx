import { formatDistanceToNow } from "date-fns";
import { Camera, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FEEDBACK_TYPES,
  TYPE_COLORS,
  TYPE_LABELS,
  type FeedbackRow,
  type FeedbackType,
} from "@/features/admin/feedback/feedbackTypes";

interface FeedbackKanbanViewProps {
  rows: FeedbackRow[];
  typeFilter: FeedbackType | "all";
  onSelectRow: (row: FeedbackRow) => void;
}

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

function FeedbackKanbanCard({
  row,
  onSelect,
}: {
  row: FeedbackRow;
  onSelect: () => void;
}) {
  const username = row.profiles?.username ?? row.user_id.slice(0, 8);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-sm border border-border-default bg-surface-card p-3 text-left transition-colors hover:border-border-strong hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <p className="text-xs font-medium text-text-primary">{username}</p>
      <p className="mt-1.5 line-clamp-3 text-sm text-text-secondary">{row.message}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-2xs text-text-disabled">
          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
        </span>
        {row.screenshot_path && (
          <Camera className="h-3.5 w-3.5 shrink-0 text-text-disabled" aria-label="Has screenshot" />
        )}
      </div>
    </button>
  );
}

function KanbanColumn({
  type,
  items,
  onSelectRow,
}: {
  type: FeedbackType;
  items: FeedbackRow[];
  onSelectRow: (row: FeedbackRow) => void;
}) {
  return (
    <div className="flex h-full min-h-[420px] w-[280px] min-w-[280px] shrink-0 snap-center flex-col overflow-hidden rounded-sm border border-border-default bg-surface-muted">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-default bg-surface-card p-4">
        <TypePill type={type} />
        <span className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">
          {items.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-sm border-2 border-dashed border-border-default/40 p-6 text-center text-text-secondary/60">
            <p className="text-sm font-medium opacity-80">No items</p>
            <p className="mt-1 max-w-[150px] text-xs opacity-60">
              {TYPE_LABELS[type]} submissions will appear here
            </p>
          </div>
        ) : (
          items.map((row) => (
            <FeedbackKanbanCard key={row.id} row={row} onSelect={() => onSelectRow(row)} />
          ))
        )}
      </div>
    </div>
  );
}

export function FeedbackKanbanView({
  rows,
  typeFilter,
  onSelectRow,
}: FeedbackKanbanViewProps) {
  const visibleTypes =
    typeFilter === "all" ? FEEDBACK_TYPES : ([typeFilter] as FeedbackType[]);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-sm border border-border-default py-16 text-text-secondary">
        No feedback yet.
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0">
      <div className="flex h-[calc(100vh-220px)] min-h-[500px] w-full min-w-0 gap-4 overflow-x-auto pb-4 pl-1 pr-12 snap-x snap-mandatory md:pr-4">
        {visibleTypes.map((type) => (
          <KanbanColumn
            key={type}
            type={type}
            items={rows.filter((r) => r.type === type)}
            onSelectRow={onSelectRow}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-4 right-0 top-0 flex w-12 items-center justify-end bg-gradient-to-l from-surface-default via-surface-default/80 to-transparent pr-1 opacity-80 md:hidden">
        <ChevronRight className="h-8 w-8 animate-pulse text-text-secondary/70" />
      </div>
    </div>
  );
}
