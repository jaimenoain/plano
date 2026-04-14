import type { FeedEventAttendance, FeedHomeEntry, FeedReview } from "@/types/feed";

function isEventAttendanceEntry(entry: FeedHomeEntry): entry is FeedEventAttendance {
  return "rowType" in entry && entry.rowType === "event_attendance";
}
import { resolveCardType } from "@/features/feed/utils/resolveCardType";
import { SuggestedContentBlock } from "@/features/feed/components/SuggestedContentBlock";
import { FeedCardA } from "./FeedCardA";
import { FeedCardB } from "./FeedCardB";
import { FeedCardC } from "./FeedCardC";
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
  /**
   * Alternation index for Type B image column only — parent should increment once per Type B card
   * in feed order (ignored when the entry resolves to A, C, or activity).
   */
  typeBAlternateIndex?: number;
}

/**
 * Main-feed review card: {@link resolveCardType} dispatcher to {@link FeedCardA} / {@link FeedCardB} / {@link FeedCardC} / {@link FeedActivityRow}.
 * Suggested-post chrome wraps A–C; activity rows keep their own chrome.
 */
export function ReviewCardFeed({
  entry,
  onLike,
  onImageLike,
  onComment,
  hideUser = false,
  hideBuildingInfo = false,
  showCommunityImages = true,
  typeBAlternateIndex = 0,
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

  const inner =
    t === "A" ? (
      <FeedCardA
        entry={review}
        hideUser={hideUser}
        hideBuildingInfo={hideBuildingInfo}
        showCommunityImages={showCommunityImages}
        onLike={onLike}
        onComment={onComment}
      />
    ) : t === "B" ? (
      <FeedCardB
        entry={review}
        index={typeBAlternateIndex}
        hideUser={hideUser}
        hideBuildingInfo={hideBuildingInfo}
        showCommunityImages={showCommunityImages}
        onLike={onLike}
        onComment={onComment}
        onImageLike={onImageLike}
      />
    ) : (
      <FeedCardC
        entry={review}
        hideUser={hideUser}
        hideBuildingInfo={hideBuildingInfo}
        showCommunityImages={showCommunityImages}
        onLike={onLike}
        onComment={onComment}
        onImageLike={onImageLike}
      />
    );

  return (
    <div className="contents" data-testid={`review-card-feed-${review.id}`}>
      <SuggestedContentBlock isSuggested={review.is_suggested} suggestionReason={review.suggestion_reason}>
        {inner}
      </SuggestedContentBlock>
    </div>
  );
}
