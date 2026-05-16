import type { FeedEventAttendance, FeedHomeEntry, FeedReview } from "@/types/feed";
import { resolveCardType } from "@/features/posts/utils/resolveCardType";
import { SuggestedContentBlock } from "@/features/posts/components/SuggestedContentBlock";
import { FeedCardA } from "./FeedCardA";
import { FeedCardB } from "./FeedCardB";
import { FeedCardC } from "./FeedCardC";
import { FeedActivityRow } from "./FeedActivityRow";
import { FeedEventAttendanceRow } from "./FeedEventAttendanceRow";

function isEventAttendanceEntry(entry: FeedHomeEntry): entry is FeedEventAttendance {
  return "rowType" in entry && entry.rowType === "event_attendance";
}

export interface ReviewCardFeedProps {
  entry: FeedHomeEntry;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  showCommunityImages?: boolean;
}

export function ReviewCardFeed({
  entry,
  onLike,
  onImageLike,
  onComment,
  hideUser = false,
  hideBuildingInfo = false,
  showCommunityImages = true,
}: ReviewCardFeedProps) {
  if (isEventAttendanceEntry(entry)) {
    return (
      <div className="contents" data-testid={`review-card-feed-${entry.id}`}>
        <FeedEventAttendanceRow entry={entry} />
      </div>
    );
  }

  const review: FeedReview = entry;
  const t = resolveCardType(review);

  if (t === "activity") {
    return (
      <div className="contents" data-testid={`review-card-feed-${review.id}`}>
        <FeedActivityRow
          entry={review}
          activityStatus={review.status === "pending" ? "pending" : "visited"}
          hideUser={hideUser}
          showCommunityImages={showCommunityImages}
        />
      </div>
    );
  }

  const shared = {
    hideUser,
    hideBuildingInfo,
    showCommunityImages,
    onLike,
    onComment,
  };

  return (
    <div className="contents" data-testid={`review-card-feed-${review.id}`}>
      <SuggestedContentBlock isSuggested={review.is_suggested} suggestionReason={review.suggestion_reason}>
        {t === "A" ? (
          <FeedCardA entry={review} {...shared} />
        ) : t === "B" ? (
          <FeedCardB entry={review} {...shared} onImageLike={onImageLike} />
        ) : (
          <FeedCardC entry={review} {...shared} onImageLike={onImageLike} />
        )}
      </SuggestedContentBlock>
    </div>
  );
}
