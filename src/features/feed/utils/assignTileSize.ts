import type { FeedItem } from "@/types/feedItem";

export type TileSize = "xl" | "lg" | "md" | "sm";

/**
 * Assigns a display tile size to a feed item.
 *
 * xl — 2×2 grid cells (video posts, exceptionally high-score, or anchor position)
 * lg — 2×1 wide (high-score with media)
 * md — 1×1 standard (any media)
 * sm — 1×1 compressed (text-only pull-quote)
 *
 * Invariant: text-only posts never get xl.
 */
export function assignTileSize(item: FeedItem, isAnchor = false): TileSize {
  // editorial: always xl — anchored to position 0, full visual weight
  if (item.kind === "editorial") {
    return "xl";
  }

  // building_spotlight: xl for high-score ring-1 buildings, lg by default
  if (item.kind === "building_spotlight") {
    return item.score > 8.0 && item.ring === "direct" ? "xl" : "lg";
  }

  // moment_cluster: always lg — one wide card showing the lead image + thumbnails
  if (item.kind === "moment_cluster") {
    return "lg";
  }

  // Non-post items always render at md
  if (item.kind !== "post") {
    return "md";
  }

  const hasVideo = Boolean(item.payload.video_url);
  const imageCount = item.payload.images?.length ?? 0;
  const hasMedia = hasVideo || imageCount > 0;

  // Video always gets xl
  if (hasVideo) {
    return "xl";
  }

  // Anchor (first item): xl if has media, lg if text-only
  if (isAnchor && hasMedia) {
    return "xl";
  }
  if (isAnchor && !hasMedia) {
    return "lg";
  }

  // Score-based sizing (requires media to scale up)
  if (item.score > 8.0 && hasMedia) {
    return "xl";
  }
  if (item.score > 4.0 && hasMedia) {
    return "lg";
  }
  if (hasMedia) {
    return "md";
  }

  return "sm";
}
