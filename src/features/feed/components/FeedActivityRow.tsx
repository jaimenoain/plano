import type { MouseEvent } from "react";
import { useNavigate } from "react-router";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { SuggestedContentBlock } from "@/features/feed/components/SuggestedContentBlock";
import { ActivityLead } from "@/features/feed/components/card-parts";
import { CardBookmark } from "@/features/feed/components/card-primitives";
import { cn } from "@/lib/utils";

export type FeedActivityStatus = "visited" | "pending";

export interface FeedActivityRowProps {
  entry: FeedReview;
  /**
   * Visited vs bucket-list; when omitted, derived from `entry.status === "pending"`.
   */
  activityStatus?: FeedActivityStatus;
  /**
   * Pre-built actor line when the feed aggregates multiple actors (e.g. `@a, @b, and N others visited`).
   */
  displayText?: string;
  hideUser?: boolean;
  showCommunityImages?: boolean;
  /** Merged last; use e.g. `border-0` when parent uses `divide-y`. */
  className?: string;
}

function resolveActivityStatus(
  entry: FeedReview,
  explicit?: FeedActivityStatus,
): FeedActivityStatus {
  if (explicit) return explicit;
  return entry.status === "pending" ? "pending" : "visited";
}

/**
 * Feed — activity-only row (visited / wants to visit), no review body or social footer.
 */
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

  const { username, mainTitle, city } = data;
  const activityStatus = resolveActivityStatus(entry, activityStatusProp);
  const verb = activityStatus === "pending" ? "wants to visit" : "visited";

  const thumbUrl =
    getBuildingImageUrl(entry.building.main_image_url) ??
    (showCommunityImages ? getBuildingImageUrl(entry.building.community_preview_url) : undefined);

  const handleRowClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building?.id) {
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    }
  };

  return (
    <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
      <div
        data-testid={`feed-activity-row-${entry.id}`}
        onClick={handleRowClick}
        className={cn(
          "group/activity-row flex min-w-0 cursor-pointer items-center gap-2 border-b border-border-default py-3 md:gap-4",
          className,
        )}
      >
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-none bg-surface-muted">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {!hideUser && displayText ? (
            <p className="min-w-0 font-sans text-2xs tracking-[0.12em] text-text-secondary">
              <span className="font-medium text-text-primary">{displayText}</span>
            </p>
          ) : (
            <ActivityLead
              username={username}
              verb={verb}
              hideUser={hideUser}
              usernameWithAt
            />
          )}
          <p className="min-w-0 font-sans text-[1.3125rem] font-black tracking-tight leading-none text-text-primary line-clamp-1">
            {mainTitle}
          </p>
          {city.trim() ? (
            <p className="font-sans text-2xs tracking-[0.12em] uppercase text-text-secondary">
              {city}
            </p>
          ) : null}
        </div>
        <CardBookmark buildingId={entry.building.id} hoverGroup="activity-row" />
      </div>
    </SuggestedContentBlock>
  );
}
