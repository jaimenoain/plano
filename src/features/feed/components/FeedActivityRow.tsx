import { formatDistanceToNow } from "date-fns";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { SuggestedContentBlock } from "@/features/feed/components/SuggestedContentBlock";
import { cn } from "@/lib/utils";

export type FeedActivityStatus = "visited" | "pending";

export interface FeedActivityRowProps {
  entry: FeedReview;
  activityStatus?: FeedActivityStatus;
  displayText?: string;
  hideUser?: boolean;
  showCommunityImages?: boolean;
  className?: string;
}

function resolveActivityStatus(
  entry: FeedReview,
  explicit?: FeedActivityStatus,
): FeedActivityStatus {
  if (explicit) return explicit;
  return entry.status === "pending" ? "pending" : "visited";
}

export function FeedActivityRow({
  entry,
  activityStatus: activityStatusProp,
  displayText,
  hideUser = false,
  showCommunityImages = true,
  className,
}: FeedActivityRowProps) {
  const navigate = useNavigate();
  const { data } = useReviewCardData(entry, { showCommunityImages });

  if (!data || !entry.building) return null;

  const { username, mainTitle, avatarUrl } = data;
  const activityStatus = resolveActivityStatus(entry, activityStatusProp);
  const verb = activityStatus === "pending" ? "wants to visit" : "visited";
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true });

  const handleRowClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building?.id) {
      const b = entry.building;
      navigate(
        b.locality_country_code && b.locality_city_slug
          ? getBuildingLocalityUrl(b.locality_country_code, b.locality_city_slug, b.id, b.slug, b.short_id)
          : getBuildingUrl(b.id, b.slug, b.short_id),
      );
    }
  };

  const actorLine = displayText ?? (hideUser ? null : `@${username} ${verb}`);

  return (
    <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
      <div
        data-testid={`feed-activity-row-${entry.id}`}
        onClick={handleRowClick}
        className={cn(
          "group/activity flex min-w-0 cursor-pointer items-center gap-3 border-t border-border-default py-4 transition-colors hover:bg-surface-muted/20",
          className,
        )}
      >
        {/* Small avatar */}
        {avatarUrl && !hideUser && (
          <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-surface-muted">
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}

        {/* Inline sentence */}
        <p className="min-w-0 flex-1 truncate font-sans text-[13px] text-text-secondary leading-none">
          {actorLine && (
            <span className="font-medium text-text-primary">{actorLine} </span>
          )}
          <span className="font-medium text-text-primary">{mainTitle}</span>
          {entry.building.city?.trim() && (
            <span className="text-text-disabled"> · {entry.building.city}</span>
          )}
        </p>

        {/* Time ago */}
        <span className="ml-2 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
          {timeAgo}
        </span>
      </div>
    </SuggestedContentBlock>
  );
}
