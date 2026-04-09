import type { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

/**
 * Visited/saved log cards: when Hero is off, only the profile owner's uploaded
 * review images apply. When Hero is on, prefer building hero / community preview, then user photos.
 */
export function profileLogCardImageUrl(
  entry: FeedReview,
  heroImageryEnabled: boolean,
): string | null {
  const heroFromBuilding =
    getBuildingImageUrl(entry.building.main_image_url) ??
    getBuildingImageUrl(entry.building.community_preview_url);
  const userFirst = entry.images?.find((img) => img.url)?.url ?? null;
  if (heroImageryEnabled) {
    return heroFromBuilding || userFirst || null;
  }
  return userFirst || null;
}
