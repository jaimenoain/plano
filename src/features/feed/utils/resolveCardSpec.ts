import type { CardImageWeight, CardLayout, CardProminence, CardSpec, CardTextWeight } from "@/types/cards";
import type { FeedReview, ReviewImage } from "@/types/feed";

function countWords(content: string | null | undefined): number {
  if (content == null) return 0;
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function resolveTextWeightFromWordCount(wordCount: number): CardTextWeight {
  if (wordCount < 1) return "none";
  if (wordCount < 20) return "snippet";
  if (wordCount < 150) return "body";
  return "essay";
}

function countUsableReviewImages(images: ReviewImage[] | null | undefined): number {
  if (images == null || images.length === 0) return 0;
  return images.filter((img) => typeof img.url === "string" && img.url.trim().length > 0).length;
}

export function resolveImageWeightFromCount(count: number): CardImageWeight {
  if (count < 1) return "none";
  if (count === 1) return "single";
  if (count === 2) return "pair";
  return "gallery";
}

const LAYOUT_MATRIX: Record<`${CardImageWeight}:${CardTextWeight}`, CardLayout> = {
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

export function resolveLayoutFromWeights(
  imageWeight: CardImageWeight,
  textWeight: CardTextWeight,
): CardLayout {
  const key = `${imageWeight}:${textWeight}` as keyof typeof LAYOUT_MATRIX;
  return LAYOUT_MATRIX[key];
}

function resolveProminence(entry: FeedReview): CardProminence {
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
 * Pure resolver: derives {@link CardSpec} from review metrics (word count, images, engagement, author signals).
 * Safe with null/undefined content, missing `images`, empty URLs, and partial `user` flags.
 */
export function resolveCardSpec(entry: FeedReview): CardSpec {
  const wc = countWords(entry.content);
  const textWeight = resolveTextWeightFromWordCount(wc);
  const usableImages = countUsableReviewImages(entry.images);
  const imageWeight = resolveImageWeightFromCount(usableImages);
  const layout = resolveLayoutFromWeights(imageWeight, textWeight);
  const prominence = resolveProminence(entry);

  return { layout, imageWeight, textWeight, prominence };
}
