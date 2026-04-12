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

export interface FeedActivityRowProps {
  entry: FeedReview;
  hideUser?: boolean;
  showCommunityImages?: boolean;
  /** Merged last; use e.g. `border-0` when parent uses `divide-y`. */
  className?: string;
}

/**
 * Feed — activity-only row (visited / wants to visit), no review body or social footer.
 */
export function FeedActivityRow({
  entry,
  hideUser = false,
  showCommunityImages = true,
  className,
}: FeedActivityRowProps) {
  const navigate = useNavigate();
  const { data } = useReviewCardData(entry);

  if (!data || !entry.building) return null;

  const { username, mainTitle } = data;
  const verb = entry.status === "pending" ? "wants to visit" : "visited";

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
          "group/activity-row flex min-w-0 cursor-pointer items-center gap-4 border-b border-border-default py-3",
          className,
        )}
      >
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-none bg-surface-muted">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ActivityLead username={username} verb={verb} hideUser={hideUser} />
          <p className="min-w-0 font-sans text-2xl font-black tracking-tight leading-none text-text-primary line-clamp-1">
            {mainTitle}
          </p>
        </div>
        <CardBookmark buildingId={entry.building.id} hoverGroup="activity-row" />
      </div>
    </SuggestedContentBlock>
  );
}
