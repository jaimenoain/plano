import type { FeedReview } from "@/types/feed";
import { resolveDetailVariant } from "@/features/feed/utils/resolveCardType";
import { DetailCardNoMedia } from "@/features/feed/components/detail/DetailCardNoMedia";
import { DetailCardWithMedia } from "@/features/feed/components/detail/DetailCardWithMedia";

export interface DetailCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

/**
 * Building-detail review dispatcher — variant from {@link resolveDetailVariant}
 * (Roadmap Task 3.1). `hideBuildingInfo` is always true for this surface; wired in Tasks 3.2+.
 */
export function DetailCard({ entry, onLike, onComment }: DetailCardProps) {
  const variant = resolveDetailVariant(entry);

  if (variant.hasMedia) {
    return (
      <DetailCardWithMedia
        entry={entry}
        variant={variant}
        onLike={onLike}
        onComment={onComment}
      />
    );
  }

  return (
    <DetailCardNoMedia
      entry={entry}
      variant={variant}
      onLike={onLike}
      onComment={onComment}
    />
  );
}
