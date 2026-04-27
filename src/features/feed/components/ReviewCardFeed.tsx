import type { FeedEventAttendance, FeedHomeEntry, FeedReview } from "@/types/feed";

function isEventAttendanceEntry(entry: FeedHomeEntry): entry is FeedEventAttendance {
  return "rowType" in entry && entry.rowType === "event_attendance";
}
import { resolveCardType } from "@/features/feed/utils/resolveCardType";
import { SuggestedContentBlock } from "@/features/feed/components/SuggestedContentBlock";
import { FeedCard } from "./FeedCard";
import { FeedActivityRow } from "./FeedActivityRow";
import { FeedEventAttendanceRow } from "./FeedEventAttendanceRow";

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

  return (
    <div className="contents" data-testid={`review-card-feed-${review.id}`}>
      <SuggestedContentBlock isSuggested={review.is_suggested} suggestionReason={review.suggestion_reason}>
        <FeedCard
          entry={review}
          hideUser={hideUser}
          hideBuildingInfo={hideBuildingInfo}
          showCommunityImages={showCommunityImages}
          onLike={onLike}
          onComment={onComment}
          onImageLike={onImageLike}
        />
      </SuggestedContentBlock>
    </div>
  );
}
