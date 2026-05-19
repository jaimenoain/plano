import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { buildFeedbackClaudePrompt } from "@/features/admin/feedback/buildFeedbackClaudePrompt";
import type { FeedbackRow } from "@/features/admin/feedback/feedbackTypes";
import { CopyFeedbackClaudePromptButton } from "./CopyFeedbackClaudePromptButton";

interface FeedbackDetailContentProps {
  row: FeedbackRow;
  signingUrl: string | null;
  onViewScreenshot: (screenshotPath: string) => void;
}

export function FeedbackDetailContent({
  row,
  signingUrl,
  onViewScreenshot,
}: FeedbackDetailContentProps) {
  const claudePrompt = useMemo(() => buildFeedbackClaudePrompt(row), [row]);

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-sm border border-border-default bg-surface-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-text-primary">Claude Code prompt</p>
          <CopyFeedbackClaudePromptButton row={row} />
        </div>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-text-secondary">
          {claudePrompt}
        </pre>
      </div>
      <div>
        <p className="mb-1 font-medium text-text-primary">Full message</p>
        <p className="whitespace-pre-wrap text-text-secondary">{row.message}</p>
      </div>
      {row.user_agent && (
        <div>
          <p className="mb-1 font-medium text-text-primary">Browser</p>
          <p className="break-all text-text-secondary">{row.user_agent}</p>
        </div>
      )}
      <div>
        <p className="mb-1 font-medium text-text-primary">Console errors</p>
        {row.console_errors.length === 0 ? (
          <p className="text-text-secondary">None</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs text-feedback-destructive">
            {row.console_errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>
      {Object.keys(row.metadata).length > 0 && (
        <div>
          <p className="mb-1 font-medium text-text-primary">Metadata</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-secondary">
            {Object.entries(row.metadata).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium text-text-primary">{k}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
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
    </div>
  );
}
