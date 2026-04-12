import type { CardType } from "@/types/cards";
import type { FeedReview, ReviewImage } from "@/types/feed";

/** Fixed grid height (px) for Type B two-column cards. */
export const CARD_B_HEIGHT = 320;

/** Fixed image strip height (px) for Type C and Type B mobile stack. */
export const CARD_C_IMAGE_HEIGHT = 185;

function hasTextContent(content: string | null | undefined): boolean {
  if (content == null) return false;
  return content.trim().length > 0;
}

function countUsableReviewImages(images: ReviewImage[] | null | undefined): number {
  if (images == null || images.length === 0) return 0;
  return images.filter((img) => typeof img.url === "string" && img.url.trim().length > 0).length;
}

function hasReviewMedia(entry: FeedReview): boolean {
  if (countUsableReviewImages(entry.images) > 0) return true;
  const video = entry.video_url;
  return typeof video === "string" && video.trim().length > 0;
}

/**
 * Maps a feed review to the card taxonomy: A (text only), B (text + media), C (media only), activity (neither).
 */
export function resolveCardType(entry: FeedReview): CardType {
  const text = hasTextContent(entry.content);
  const media = hasReviewMedia(entry);
  if (!text && !media) return "activity";
  if (media && !text) return "C";
  if (text && !media) return "A";
  return "B";
}
