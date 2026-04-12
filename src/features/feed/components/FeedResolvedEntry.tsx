import type { FeedReview } from "@/types/feed";
import { resolveCardType } from "@/features/feed/utils/resolveCardType";
import { FeedCardA } from "./FeedCardA";
import { FeedCardB } from "./FeedCardB";
import { FeedCardC } from "./FeedCardC";
import { FeedActivityRow } from "./FeedActivityRow";

export interface FeedResolvedEntryProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  /** Feed position for alternating Type B image column. */
  index?: number;
}

/**
 * Resolves {@link resolveCardType} and renders {@link FeedCardA} / {@link FeedCardB} / {@link FeedCardC} / {@link FeedActivityRow}.
 */
export function FeedResolvedEntry({
  entry,
  onLike,
  onImageLike,
  onComment,
  hideUser = false,
  hideBuildingInfo = false,
  index = 0,
}: FeedResolvedEntryProps) {
  const t = resolveCardType(entry);

  if (t === "activity") {
    return (
      <div className="contents" data-testid={`review-card-feed-${entry.id}`}>
        <FeedActivityRow entry={entry} hideUser={hideUser} />
      </div>
    );
  }

  const inner =
    t === "A" ? (
      <FeedCardA
        entry={entry}
        hideUser={hideUser}
        hideBuildingInfo={hideBuildingInfo}
        onLike={onLike}
        onComment={onComment}
      />
    ) : t === "B" ? (
      <FeedCardB
        entry={entry}
        index={index}
        hideUser={hideUser}
        hideBuildingInfo={hideBuildingInfo}
        onLike={onLike}
        onComment={onComment}
        onImageLike={onImageLike}
      />
    ) : (
      <FeedCardC
        entry={entry}
        hideUser={hideUser}
        hideBuildingInfo={hideBuildingInfo}
        onLike={onLike}
        onComment={onComment}
        onImageLike={onImageLike}
      />
    );

  return (
    <div className="contents" data-testid={`review-card-feed-${entry.id}`}>
      {inner}
    </div>
  );
}
