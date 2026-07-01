import type { CardType, DetailCardTextTreatment, DetailCardVariant } from "@/types/cards";
import type { FeedReview, ReviewImage } from "@/types/feed";

/** One row of the building-detail overflow photo grid (Roadmap Task 3.4 / §4.5). */
export type DetailOverflowGridRow = {
  columnCount: 2 | 3;
  images: ReviewImage[];
};

/**
 * Partitions `entry.images.slice(1)` into 2- and 3-column rows: pairs of 2 until an odd
 * remainder, then a single 3-column row for the final three images; a lone overflow image spans both columns.
 */
export function partitionDetailOverflowImages(images: ReviewImage[]): DetailOverflowGridRow[] {
  const n = images.length;
  if (n === 0) return [];
  if (n === 1) {
    return [{ columnCount: 2, images }];
  }
  if (n % 2 === 0) {
    const rows: DetailOverflowGridRow[] = [];
    for (let i = 0; i < n; i += 2) {
      rows.push({ columnCount: 2, images: images.slice(i, i + 2) });
    }
    return rows;
  }
  const rows: DetailOverflowGridRow[] = [];
  let i = 0;
  while (n - i > 3) {
    rows.push({ columnCount: 2, images: images.slice(i, i + 2) });
    i += 2;
  }
  rows.push({ columnCount: 3, images: images.slice(i, i + 3) });
  return rows;
}

/** Fixed grid height (px) for Type B two-column cards. */
export const CARD_B_HEIGHT = 320;

/** Fixed image strip height (px) for Type C and Type B mobile stack. */
export const CARD_C_IMAGE_HEIGHT = 185;

export function countWords(content: string | null | undefined): number {
  if (content == null) return 0;
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function hasTextContent(content: string | null | undefined): boolean {
  return countWords(content) > 0;
}

function countUsableReviewImages(images: ReviewImage[] | null | undefined): number {
  if (images == null || images.length === 0) return 0;
  return images.filter((img) => typeof img.url === "string" && img.url.trim().length > 0).length;
}

function hasReviewVideo(entry: FeedReview): boolean {
  const video = entry.video_url;
  return typeof video === "string" && video.trim().length > 0;
}

function reviewMediaCount(entry: FeedReview): number {
  return countUsableReviewImages(entry.images) + (hasReviewVideo(entry) ? 1 : 0);
}

export function hasReviewMedia(entry: FeedReview): boolean {
  return reviewMediaCount(entry) > 0;
}

export function detailTextTreatmentFromWordCount(wordCount: number): DetailCardTextTreatment {
  if (wordCount < 1) return "none";
  if (wordCount <= 20) return "quote";
  return "body";
}

function photoColHeightFromTextTreatment(treatment: DetailCardTextTreatment): DetailCardVariant["photoColHeight"] {
  switch (treatment) {
    case "none":
      return 260;
    case "quote":
      return 300;
    case "body":
      return 400;
  }
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

/**
 * Mono metadata line when a detail card has media but no review text (Roadmap §4.4).
 * Example: `4 photos · 1 video`
 */
export function formatDetailMediaMetadataLine(entry: FeedReview): string {
  const photoCount = countUsableReviewImages(entry.images);
  const hasVideo = hasReviewVideo(entry);
  const parts: string[] = [];
  if (photoCount > 0) {
    parts.push(`${photoCount} ${photoCount === 1 ? "photo" : "photos"}`);
  }
  if (hasVideo) {
    parts.push("1 video");
  }
  return parts.join(" · ");
}

/**
 * Building-detail review card layout variant (photo column height and copy tier).
 */
export function resolveDetailVariant(entry: FeedReview): DetailCardVariant {
  const wc = countWords(entry.content);
  const textTreatment = detailTextTreatmentFromWordCount(wc);
  const hasMedia = hasReviewMedia(entry);
  const mediaCount = reviewMediaCount(entry);
  const photoColHeight = photoColHeightFromTextTreatment(textTreatment);

  return { hasMedia, mediaCount, textTreatment, photoColHeight };
}
