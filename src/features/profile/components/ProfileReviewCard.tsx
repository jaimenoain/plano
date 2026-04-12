import { CardTypeA } from "@/features/feed/components/CardTypeA";
import { CardTypeB } from "@/features/feed/components/CardTypeB";
import { CardTypeC } from "@/features/feed/components/CardTypeC";
import { ActivityStreamGroup } from "@/features/feed/components/ActivityStream";
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
 * Profile surfaces: resolved A/B/C with implicit author; single-line activity uses `ActivityStreamGroup`.
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
    return <ActivityStreamGroup entries={[entry]} />;
  }
  const shared = {
    hideUser: true,
    hideBuildingInfo: false,
    showCommunityImages,
    onLike,
  };
  switch (t) {
    case "A":
      return <CardTypeA entry={entry} {...shared} />;
    case "B":
      return (
        <CardTypeB
          entry={entry}
          {...shared}
          index={index}
          imagePosition={imagePosition}
          onImageLike={onImageLike}
        />
      );
    case "C":
      return <CardTypeC entry={entry} {...shared} onImageLike={onImageLike} />;
    default: {
      const _u: never = t;
      return _u;
    }
  }
}
