import type { FeedReview, ReviewImage } from "@/types/feed";

/**
 * Image-count tier from user review images only (playground fixtures / layout regression).
 */
export type LegacyFeedImageWeight = "none" | "single" | "pair" | "gallery";

/**
 * Body length tier from word count (legacy stacked / hero cards).
 */
export type LegacyFeedTextWeight = "none" | "snippet" | "body" | "essay";

/**
 * Media vs copy arrangement (legacy feed card chrome).
 */
export type LegacyFeedArrangement =
  | "media-forward"
  | "balanced"
  | "text-forward"
  | "compact-stack";

export type LegacyFeedProminence = "standard" | "elevated";

/**
 * Layout hints frozen for `cardFixtures` / superadmin card playground regression scans.
 */
export interface LegacyFeedCardUi {
  layout: LegacyFeedArrangement;
  imageWeight: LegacyFeedImageWeight;
  textWeight: LegacyFeedTextWeight;
  prominence: LegacyFeedProminence;
}

function countWords(content: string | null | undefined): number {
  if (content == null) return 0;
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function legacyFeedTextWeightFromWordCount(wordCount: number): LegacyFeedTextWeight {
  if (wordCount < 1) return "none";
  if (wordCount < 20) return "snippet";
  if (wordCount < 150) return "body";
  return "essay";
}

function countUsableReviewImages(images: ReviewImage[] | null | undefined): number {
  if (images == null || images.length === 0) return 0;
  return images.filter((img) => typeof img.url === "string" && img.url.trim().length > 0).length;
}

export function legacyFeedImageWeightFromCount(count: number): LegacyFeedImageWeight {
  if (count < 1) return "none";
  if (count === 1) return "single";
  if (count === 2) return "pair";
  return "gallery";
}

const ARRANGEMENT_MATRIX: Record<`${LegacyFeedImageWeight}:${LegacyFeedTextWeight}`, LegacyFeedArrangement> = {
  "none:none": "compact-stack",
  "none:snippet": "compact-stack",
  "none:body": "text-forward",
  "none:essay": "text-forward",
  "single:none": "media-forward",
  "single:snippet": "balanced",
  "single:body": "balanced",
  "single:essay": "text-forward",
  "pair:none": "media-forward",
  "pair:snippet": "balanced",
  "pair:body": "balanced",
  "pair:essay": "balanced",
  "gallery:none": "media-forward",
  "gallery:snippet": "media-forward",
  "gallery:body": "balanced",
  "gallery:essay": "balanced",
};

export function legacyFeedArrangementFromWeights(
  imageWeight: LegacyFeedImageWeight,
  textWeight: LegacyFeedTextWeight,
): LegacyFeedArrangement {
  const key = `${imageWeight}:${textWeight}` as keyof typeof ARRANGEMENT_MATRIX;
  return ARRANGEMENT_MATRIX[key];
}

function legacyFeedProminenceFromEntry(entry: FeedReview): LegacyFeedProminence {
  const likes = entry.likes_count ?? 0;
  const followers = entry.user?.followers_count;
  const followersHigh = typeof followers === "number" && followers > 500;
  const verified = Boolean(entry.user?.is_verified_architect);
  const architectOfBuilding = Boolean(entry.user?.is_architect_of_building);

  if (likes > 50 || followersHigh || verified || architectOfBuilding) {
    return "elevated";
  }
  return "standard";
}

/**
 * Pure layout hints for legacy stacked/hero review cards (word count, images, engagement).
 */
export function deriveLegacyFeedCardLayout(entry: FeedReview): LegacyFeedCardUi {
  const wc = countWords(entry.content);
  const textWeight = legacyFeedTextWeightFromWordCount(wc);
  const usableImages = countUsableReviewImages(entry.images);
  const imageWeight = legacyFeedImageWeightFromCount(usableImages);
  const layout = legacyFeedArrangementFromWeights(imageWeight, textWeight);
  const prominence = legacyFeedProminenceFromEntry(entry);

  return { layout, imageWeight, textWeight, prominence };
}
