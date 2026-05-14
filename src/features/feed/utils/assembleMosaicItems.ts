import type { FeedItem } from "@/types/feedItem";
import { assignTileSize, type TileSize } from "./assignTileSize";

export interface MosaicItem {
  item: FeedItem;
  tileSize: TileSize;
}

function getAuthorUsername(item: FeedItem): string | null {
  if (item.kind !== "post") return null;
  return item.payload.user?.username ?? null;
}

function getBuildingId(item: FeedItem): string | null {
  if (item.kind === "post") return item.payload.building?.id ?? null;
  if (item.kind === "building_spotlight") return item.payload.buildingId;
  if (item.kind === "editorial") return item.payload.buildingId;
  return null;
}

function conflicts(a: FeedItem, b: FeedItem): boolean {
  // Author conflict: only between post items
  if (a.kind === "post" && b.kind === "post") {
    const authorA = getAuthorUsername(a);
    const authorB = getAuthorUsername(b);
    if (authorA && authorB && authorA === authorB) return true;
  }

  // Building conflict: between any items that reference the same building
  // (e.g. a spotlight and a post about the same building should not be adjacent)
  const buildingA = getBuildingId(a);
  const buildingB = getBuildingId(b);
  if (buildingA && buildingB && buildingA === buildingB) return true;

  return false;
}

/** Minimum number of non-spotlight tiles between two spotlight tiles. */
const MIN_SPOTLIGHT_GAP = 5;

/**
 * Converts a sorted feed array into mosaic tiles with:
 *   1. Editorial items pinned to the front (position 0+).
 *   2. Tile-size assignment (editorial is always xl anchor).
 *   3. Adjacency diversity: swaps adjacent pairs sharing an author or building.
 *
 * Pure function — does not mutate input.
 */
export function assembleMosaicItems(items: FeedItem[]): MosaicItem[] {
  if (items.length === 0) return [];

  // Extract editorial items and pin them to the front of the feed.
  // The first editorial item occupies the xl anchor slot.
  const editorialItems = items.filter((i) => i.kind === "editorial");
  const nonEditorialItems = items.filter((i) => i.kind !== "editorial");

  // Work on a copy of non-editorial items to avoid mutating input
  const arr = [...editorialItems, ...nonEditorialItems];

  // Single adjacency-diversity pass: swap adjacent pairs that share an author or building.
  for (let i = 1; i < arr.length; i++) {
    if (conflicts(arr[i - 1], arr[i]) && i + 1 < arr.length) {
      const tmp = arr[i];
      arr[i] = arr[i + 1];
      arr[i + 1] = tmp;
    }
  }

  // Spotlight frequency cap: at most 1 spotlight per MIN_SPOTLIGHT_GAP surface units.
  // Spotlights too close together are deferred past the current page.
  const capped: FeedItem[] = [];
  let lastSpotlightPos = -MIN_SPOTLIGHT_GAP;
  for (const item of arr) {
    if (item.kind === "building_spotlight") {
      if (capped.length - lastSpotlightPos >= MIN_SPOTLIGHT_GAP) {
        lastSpotlightPos = capped.length;
        capped.push(item);
      }
      // else: skip — too close to the previous spotlight
    } else {
      capped.push(item);
    }
  }

  // Assign tile sizes — first item is the anchor
  return capped.map((item, index) => ({
    item,
    tileSize: assignTileSize(item, index === 0),
  }));
}
