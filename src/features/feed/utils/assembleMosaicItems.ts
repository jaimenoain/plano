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
  if (item.kind !== "post") return null;
  return item.payload.building?.id ?? null;
}

function conflicts(a: FeedItem, b: FeedItem): boolean {
  if (a.kind !== "post" || b.kind !== "post") return false;

  const authorA = getAuthorUsername(a);
  const authorB = getAuthorUsername(b);
  if (authorA && authorB && authorA === authorB) return true;

  const buildingA = getBuildingId(a);
  const buildingB = getBuildingId(b);
  if (buildingA && buildingB && buildingA === buildingB) return true;

  return false;
}

/**
 * Converts a sorted feed array into mosaic tiles with:
 *   1. Tile-size assignment (first item is the xl anchor if it has media).
 *   2. Adjacency diversity: swaps adjacent pairs sharing an author or building.
 *
 * Pure function — does not mutate input.
 */
export function assembleMosaicItems(items: FeedItem[]): MosaicItem[] {
  if (items.length === 0) return [];

  // Work on a copy to avoid mutating input
  const arr = [...items];

  // Single adjacency-diversity pass
  for (let i = 1; i < arr.length; i++) {
    if (conflicts(arr[i - 1], arr[i]) && i + 1 < arr.length) {
      // Swap arr[i] and arr[i+1]
      const tmp = arr[i];
      arr[i] = arr[i + 1];
      arr[i + 1] = tmp;
    }
  }

  // Assign tile sizes — first item is the anchor
  return arr.map((item, index) => ({
    item,
    tileSize: assignTileSize(item, index === 0),
  }));
}
