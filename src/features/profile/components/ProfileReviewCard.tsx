import { FeedCardA } from "@/features/feed/components/FeedCardA";
import { FeedCardB } from "@/features/feed/components/FeedCardB";
import { FeedCardC } from "@/features/feed/components/FeedCardC";
import { FeedActivityRow } from "@/features/feed/components/FeedActivityRow";
import { SuggestedContentBlock } from "@/features/feed/components/SuggestedContentBlock";
import { resolveCardType } from "@/features/feed/utils/resolveCardType";
import type { FeedReview } from "@/types/feed";

export interface ProfileReviewCardProps {
  entry: FeedReview;
  /** Alternating Type B image column; defaults to fixed left if omitted. */
  index?: number;
  imagePosition?: "left" | "right";
  showCommunityImages?: boolean;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
}

/**
 * Profile surfaces: resolved A/B/C with implicit author; activity uses {@link FeedActivityRow}.
 */
export function ProfileReviewCard({
  entry,
  index = 0,
  imagePosition = "left",
  showCommunityImages = true,
  onLike,
  onImageLike,
}: ProfileReviewCardProps) {
  const t = resolveCardType(entry);
  if (t === "activity") {
    return (
      <FeedActivityRow
        entry={entry}
        activityStatus={entry.status === "pending" ? "pending" : "visited"}
        hideUser
        showCommunityImages={showCommunityImages}
      />
    );
  }
  const shared = {
    hideUser: true,
    hideBuildingInfo: false,
    showCommunityImages,
    onLike,
  };
  switch (t) {
    case "A":
      return (
        <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
          <FeedCardA entry={entry} {...shared} />
        </SuggestedContentBlock>
      );
    case "B":
      return (
        <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
          <FeedCardB
            entry={entry}
            {...shared}
            index={index}
            imagePosition={imagePosition}
            onImageLike={onImageLike}
          />
        </SuggestedContentBlock>
      );
    case "C":
      return (
        <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
          <FeedCardC entry={entry} {...shared} onImageLike={onImageLike} />
        </SuggestedContentBlock>
      );
    default: {
      const _u: never = t;
      return _u;
    }
  }
}
