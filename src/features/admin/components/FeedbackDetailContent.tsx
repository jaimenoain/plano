import { useMemo } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { buildFeedbackClaudePrompt } from "@/features/admin/feedback/buildFeedbackClaudePrompt";
import {
  STATUS_COLORS,
  STATUS_OPTIONS,
  TERMINAL_STATUSES,
  TYPE_COLORS,
  TYPE_LABELS,
  type FeedbackRow,
  type FeedbackStatus,
} from "@/features/admin/feedback/feedbackTypes";
import { CopyFeedbackClaudePromptButton } from "./CopyFeedbackClaudePromptButton";

interface FeedbackDetailContentProps {
  row: FeedbackRow;
  readOnly: boolean;
  savingId: string | null;
  signingUrl: string | null;
  onViewScreenshot: (screenshotPath: string) => void;
  onStatusChange: (row: FeedbackRow, status: FeedbackStatus) => void;
  onNotesBlur: (row: FeedbackRow, notes: string) => void;
  onNeedsUserInputToggle: (row: FeedbackRow) => void;
  onReopen: (row: FeedbackRow) => void;
}

export function FeedbackDetailContent({
  row,
  readOnly,
  savingId,
  signingUrl,
  onViewScreenshot,
  onStatusChange,
  onNotesBlur,
  onNeedsUserInputToggle,
  onReopen,
}: FeedbackDetailContentProps) {
  const claudePrompt = useMemo(() => buildFeedbackClaudePrompt(row), [row]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
            Full message
          </p>
          <div className="rounded-sm border border-border-default bg-surface-card p-4">
            <p className="whitespace-pre-wrap text-sm text-text-primary">{row.message}</p>
          </div>
        </div>

        {(row.outcome_notes || !readOnly) && (
          <div>
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
              Outcome notes
            </p>
            {readOnly ? (
              <div className="rounded-sm border border-border-default bg-surface-card p-4">
                <p className="whitespace-pre-wrap text-sm text-text-secondary">
                  {row.outcome_notes ?? "—"}
                </p>
              </div>
            ) : (
              <Textarea
                defaultValue={row.outcome_notes ?? ""}
                onBlur={(e) => onNotesBlur(row, e.target.value)}
                rows={4}
                placeholder="Add notes or outcome details…"
                className="resize-none"
              />
            )}
          </div>
        )}

        {row.console_errors.length > 0 && (
          <div>
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
              Console errors
            </p>
            <ul className="space-y-1.5">
              {row.console_errors.map((err, i) => (
                <li
                  key={i}
                  className="rounded-sm border border-feedback-destructive/20 bg-feedback-destructive/5 px-3 py-2 font-mono text-xs text-feedback-destructive"
                >
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!readOnly && (
          <div className="rounded-sm border border-border-default bg-surface-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-text-primary">Claude Code prompt</p>
              <CopyFeedbackClaudePromptButton
              row={row}
              onAfterCopy={
                !readOnly && row.status === "open"
                  ? () => onStatusChange(row, "in_review")
                  : undefined
              }
            />
            </div>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-text-secondary">
              {claudePrompt}
            </pre>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
            Status
          </p>
          {readOnly ? (
            <div className="flex flex-col gap-2">
              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                  STATUS_COLORS[row.status],
                )}
              >
                {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status}
              </span>
              {TERMINAL_STATUSES.includes(row.status) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={savingId === row.id}
                  onClick={() => onReopen(row)}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reopen feedback
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = row.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => {
                      if (!isActive) onStatusChange(row, opt.value);
                    }}
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                      isActive
                        ? STATUS_COLORS[opt.value] + " ring-2 ring-offset-1 ring-current"
                        : "border-border-default bg-surface-muted text-text-disabled hover:text-text-secondary",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
          {savingId === row.id && (
            <p className="mt-2 text-xs text-brand-primary">Saving…</p>
          )}
          {row.status_changed_at && (
            <p className="mt-1 text-2xs text-text-disabled">
              Updated {new Date(row.status_changed_at).toLocaleString()}
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
            Badge
          </p>
          {readOnly ? (
            row.needs_user_input ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Needs your input
              </span>
            ) : (
              <span className="text-xs text-text-disabled">None</span>
            )
          ) : (
            <button
              type="button"
              disabled={savingId === row.id}
              onClick={() => onNeedsUserInputToggle(row)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all",
                row.needs_user_input
                  ? "bg-amber-500/15 text-amber-800 ring-2 ring-amber-500/30 ring-offset-1"
                  : "bg-surface-muted text-text-disabled hover:bg-amber-500/10 hover:text-amber-800",
              )}
            >
              Needs user input
            </button>
          )}
        </div>

        <div>
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
            Metadata
          </p>
          <dl className="space-y-2 rounded-sm border border-border-default bg-surface-muted/30 p-3 text-xs">
            {Object.entries(row.metadata).map(([k, v]) => (
              <div key={k}>
                <dt className="font-semibold uppercase text-text-disabled">{k}</dt>
                <dd className="text-text-secondary">{String(v)}</dd>
              </div>
            ))}
            <div className="border-t border-border-default pt-2">
              <dt className="font-semibold uppercase text-text-disabled">User agent</dt>
              <dd className="mt-1 break-all font-mono text-2xs text-text-secondary">
                {row.user_agent ?? "—"}
              </dd>
            </div>
          </dl>
        </div>

        {row.screenshot_path && (
          <div>
            <Button
              size="sm"
              variant="outline"
              disabled={signingUrl === "loading"}
              onClick={() => onViewScreenshot(row.screenshot_path!)}
            >
              {signingUrl === "loading" ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : null}
              View screenshot
            </Button>
          </div>
        )}

        <div>
          <p className="mb-1 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
            Type
          </p>
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
              TYPE_COLORS[row.type],
            )}
          >
            {TYPE_LABELS[row.type]}
          </span>
        </div>
      </div>
    </div>
  );
}
