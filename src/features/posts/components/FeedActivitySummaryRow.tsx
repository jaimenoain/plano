import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown } from "lucide-react";
import type { FeedReview } from "@/types/feed";
import { FeedActivityRow } from "@/features/posts/components/FeedActivityRow";
import { cn } from "@/lib/utils";

/** How many building names to spell out before the "and N more" tail. */
const NAMES_SHOWN = 2;

export interface FeedActivitySummaryRowProps {
  /** A run of "light" visits (no text, no media) by a single user — see groupHomeFeedEntries. */
  entries: FeedReview[];
}

/**
 * Collapses a run of same-user "light" visits into one expandable line, e.g.
 * `@user visited Building A, Building B and 17 more`. Tapping it reveals each visit
 * as a {@link FeedActivityRow}.
 */
export function FeedActivitySummaryRow({ entries }: FeedActivitySummaryRowProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  const first = entries[0];
  const username = first.user?.username || "Unknown User";
  const avatarUrl = first.user?.avatar_url ?? null;
  const verb = first.status === "pending" ? "wants to visit" : "visited";
  const timeAgo = formatDistanceToNow(new Date(first.created_at), { addSuffix: true });

  const names = entries.map((e) => e.building?.name).filter((n): n is string => !!n);
  const shown = names.slice(0, NAMES_SHOWN);
  const remaining = names.length - shown.length;

  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        data-testid={`feed-activity-summary-${first.id}`}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="group/summary flex w-full min-w-0 cursor-pointer items-center gap-3 border-t border-border-default py-4 text-left transition-colors hover:bg-surface-muted/20"
      >
        {/* Small avatar */}
        {avatarUrl && (
          <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-surface-muted">
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}

        {/* Summary sentence */}
        <p className="min-w-0 flex-1 truncate font-sans text-[13px] leading-none text-text-secondary">
          <span className="font-medium text-text-primary">@{username} {verb} </span>
          <span className="font-medium text-text-primary">{shown.join(", ")}</span>
          {remaining > 0 && (
            <span className="text-text-secondary"> and {remaining} more</span>
          )}
        </p>

        <ChevronDown
          className={cn(
            "ml-2 h-3.5 w-3.5 shrink-0 text-text-disabled transition-transform",
            expanded && "rotate-180",
          )}
        />
        <span className="ml-2 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
          {timeAgo}
        </span>
      </button>

      {expanded && (
        <div className="divide-y divide-border-default pl-4 md:pl-8">
          {entries.map((entry) => (
            <FeedActivityRow key={entry.id} entry={entry} hideUser className="border-0" />
          ))}
        </div>
      )}
    </div>
  );
}
