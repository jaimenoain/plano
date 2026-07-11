import type {
  DisplayImage,
  FeedEntry,
} from "../hooks/buildingCommunityData";

/**
 * Composition logic for the Overview tab's editorial stream: reviews and
 * photos are merged into scored blocks, each assigned one of five layouts.
 * Pure (no hook state) so it is unit-testable and shareable across tabs.
 */

export interface StreamBlock {
  key: string;
  entryId: string;
  user: FeedEntry["user"];
  content: string | null;
  rating: number | null;
  status: FeedEntry["status"];
  images: DisplayImage[];
  isOfficial: boolean;
  topLikes: number;
  blockType: "featured" | "mosaic" | "image-review" | "image-only" | "text-only";
  score: number;
}

/** Client-side chunks for overview editorial stream (infinite scroll). */
export const OVERVIEW_STREAM_CHUNK_SIZE = 8;

export function buildStreamBlocks(
  entries: FeedEntry[],
  displayImages: DisplayImage[],
  displayImageById: Map<string, DisplayImage>,
): StreamBlock[] {
  const entryImageIds = new Set(
    entries.flatMap((e) => {
      const ids = e.images.map((img) => img.id);
      const videoKey = `video-${e.id}`;
      if (displayImageById.get(videoKey)?.type === "video") ids.push(videoKey);
      return ids;
    }),
  );

  const entryBlocks = entries
    .map((entry): StreamBlock | null => {
      const images = entry.images
        .map((img) => displayImageById.get(img.id))
        .filter((img): img is DisplayImage => img != null);

      const videoDisplay = displayImageById.get(`video-${entry.id}`);
      const hasVideo = videoDisplay?.type === "video";
      const isOfficial = images.some((img) => img.is_official);
      const topLikes = images.reduce((max, img) => Math.max(max, img.likes_count), 0);
      const hasContent = !!(entry.content?.trim());
      const imageCount = images.length;

      if (imageCount === 0 && !hasContent && !hasVideo) return null;

      const architectBoost = entry.user?.is_architect_of_building ? 800 : 0;
      const score =
        architectBoost +
        (isOfficial ? 1000 : 0) +
        topLikes * 10 +
        (hasContent ? 20 : 0) +
        (imageCount > 1 ? 15 : 0) +
        (hasVideo && imageCount === 0 ? 10 : 0);

      let blockType: StreamBlock["blockType"];
      if (isOfficial) blockType = "featured";
      else if (imageCount >= 2) blockType = "mosaic";
      else if ((imageCount === 1 || hasVideo) && hasContent) blockType = "image-review";
      else if (imageCount === 1 || hasVideo) blockType = "image-only";
      else blockType = "text-only";

      return {
        key: entry.id,
        entryId: entry.id,
        user: entry.user,
        content: entry.content,
        rating: entry.rating,
        status: entry.status,
        images,
        isOfficial,
        topLikes,
        blockType,
        score,
      };
    })
    .filter((b): b is StreamBlock => b !== null);

  const orphanBlocks: StreamBlock[] = displayImages
    .filter((img) => !entryImageIds.has(img.id))
    .map((img): StreamBlock => ({
      key: `img-${img.id}`,
      entryId: `img-${img.id}`,
      user: img.user ?? { username: null, avatar_url: null },
      content: null,
      rating: null,
      status: "visited" as const,
      images: [img],
      isOfficial: img.is_official ?? false,
      topLikes: img.likes_count,
      blockType: (img.is_official ?? false) ? "featured" : "image-only",
      score: ((img.is_official ?? false) ? 1000 : 0) + img.likes_count * 10,
    }));

  return [...entryBlocks, ...orphanBlocks].sort((a, b) => b.score - a.score);
}
