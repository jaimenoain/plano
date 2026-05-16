import type { FeedReview } from "@/types/feed";
import { FeedActivityRow } from "@/features/posts/components/FeedActivityRow";

export interface ActivityStreamGroupProps {
  entries: FeedReview[];
  /** When true, never render the small "Activity" group label (parent supplies section title). */
  hideGroupLabel?: boolean;
  /** When true, activity row avatars use square corners (e.g. building detail chrome). */
  squareAvatars?: boolean;
}

/**
 * Consecutive activity entries: optional "Activity" label + hairline-separated rows via {@link FeedActivityRow}.
 */
export function ActivityStreamGroup({
  entries,
  hideGroupLabel = false,
  squareAvatars = false,
}: ActivityStreamGroupProps) {
  if (entries.length === 0) return null;

  const showLabel = !hideGroupLabel && entries.length > 1;

  return (
    <div className="w-full min-w-0">
      {showLabel && (
        <p className="mb-2 font-mono text-[0.5625rem] font-normal uppercase tracking-[0.12em] text-text-secondary">
          Activity
        </p>
      )}
      <div className="divide-y divide-border-default">
        {entries.map((entry) => (
          <FeedActivityRow
            key={entry.id}
            entry={entry}
            className="border-0"
            squareAvatar={squareAvatars}
          />
        ))}
      </div>
    </div>
  );
}
