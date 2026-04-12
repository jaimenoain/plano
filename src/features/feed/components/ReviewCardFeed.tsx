import type { FeedReview } from "@/types/feed";
import { resolveCardType } from "@/features/feed/utils/resolveCardType";
import { CardTypeA } from "./CardTypeA";
import { CardTypeB } from "./CardTypeB";
import { CardTypeC } from "./CardTypeC";
import { ActivityStreamGroup } from "./ActivityStream";

export interface ReviewCardFeedProps {
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
 * Feed / discovery review card: resolves {@link resolveCardType} and delegates to CardType A/B/C or activity stream.
 */
export function ReviewCardFeed({
  entry,
  onLike,
  onImageLike,
  onComment,
  hideUser = false,
  hideBuildingInfo = false,
  index = 0,
}: ReviewCardFeedProps) {
  const t = resolveCardType(entry);

  const inner =
    t === "activity" ? (
      <ActivityStreamGroup entries={[entry]} />
    ) : t === "A" ? (
      <CardTypeA
        entry={entry}
        hideUser={hideUser}
        hideBuildingInfo={hideBuildingInfo}
        onLike={onLike}
        onComment={onComment}
      />
    ) : t === "B" ? (
      <CardTypeB
        entry={entry}
        index={index}
        hideUser={hideUser}
        hideBuildingInfo={hideBuildingInfo}
        onLike={onLike}
        onComment={onComment}
        onImageLike={onImageLike}
      />
    ) : (
      <CardTypeC
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
