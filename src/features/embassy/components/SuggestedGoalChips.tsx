import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Camera, CheckCircle2, CalendarClock, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchSuggestedGoals,
  filterSuggestedGoals,
  type SuggestedGoal,
  type SuggestedGoalMetric,
} from "../api/suggestedGoals";
import { EmbassySectionLabel } from "./embassy-ui";

// Same icon language as StartHereQueue's TOOL_ICON, so a chip reads as its
// source queue at a glance.
const METRIC_ICON: Record<SuggestedGoalMetric, LucideIcon> = {
  research: Search,
  moderation: Filter,
  photos: Camera,
  outreach: CheckCircle2,
  events: CalendarClock,
};

function SuggestedGoalChip({
  suggestion,
  pending,
  onPick,
}: {
  suggestion: SuggestedGoal;
  pending: boolean;
  onPick: () => void;
}) {
  const Icon = METRIC_ICON[suggestion.metric];
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={pending}
      className={cn(
        "flex items-center gap-2 rounded-full border border-border-default bg-surface-default px-3 py-1.5",
        "text-xs font-medium text-text-secondary transition-colors select-none",
        "hover:border-text-secondary hover:text-text-primary disabled:cursor-wait disabled:opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {suggestion.title}
    </button>
  );
}

/**
 * One-click suggested goal chips, derived from the same chapter backlog that
 * powers the "Start here" queue (research/moderation/photo-gap/outreach/events).
 * Replaces the blank form as the primary way to set a goal — clicking a chip
 * creates the goal immediately via `onPick`, no dialog. Renders nothing while
 * loading or when the backlog is empty; it's a supplementary shortcut, not a
 * layout-shifting section on its own.
 *
 * `pendingMetric` and `excludeMetrics` are both owned by the caller — only it
 * knows when the create-goal mutation actually settles, and which goals the
 * user already has active. A chip whose metric is already an active goal is
 * hidden (and comes back if that goal is removed), so the row only ever offers
 * work the user hasn't committed to yet.
 */
export function SuggestedGoalChips({
  chapterId,
  pendingMetric,
  excludeMetrics,
  onPick,
}: {
  chapterId?: string;
  pendingMetric: SuggestedGoalMetric | null;
  excludeMetrics: readonly string[];
  onPick: (suggestion: SuggestedGoal) => void;
}) {
  const { data: suggestions } = useQuery({
    queryKey: ["embassy-suggested-goals", chapterId],
    queryFn: () => fetchSuggestedGoals(chapterId!),
    enabled: !!chapterId,
    staleTime: 30_000,
  });

  const visible = filterSuggestedGoals(suggestions ?? [], excludeMetrics);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <EmbassySectionLabel>Suggested</EmbassySectionLabel>
      <div className="flex flex-wrap gap-2">
        {visible.map((suggestion) => (
          <SuggestedGoalChip
            key={suggestion.metric}
            suggestion={suggestion}
            pending={pendingMetric === suggestion.metric}
            onPick={() => onPick(suggestion)}
          />
        ))}
      </div>
    </div>
  );
}
