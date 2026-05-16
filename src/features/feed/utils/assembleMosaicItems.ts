import type { FeedItem } from "@/types/feedItem";

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
  if (a.kind === "post" && b.kind === "post") {
    const authorA = getAuthorUsername(a);
    const authorB = getAuthorUsername(b);
    if (authorA && authorB && authorA === authorB) return true;
  }

  const buildingA = getBuildingId(a);
  const buildingB = getBuildingId(b);
  if (buildingA && buildingB && buildingA === buildingB) return true;

  return false;
}

/** Minimum number of non-spotlight tiles between two spotlight tiles. */
const MIN_SPOTLIGHT_GAP = 5;

/**
 * Orders a feed array for the linear surface:
 *   1. Editorial items pinned to the front.
 *   2. Adjacency diversity: swap adjacent pairs sharing an author or building.
 *   3. Spotlight frequency cap.
 *
 * Pure function — does not mutate input.
 */
export function assembleMosaicItems(items: FeedItem[]): FeedItem[] {
  if (items.length === 0) return [];

  const editorialItems = items.filter((i) => i.kind === "editorial");
  const nonEditorialItems = items.filter((i) => i.kind !== "editorial");

  const arr = [...editorialItems, ...nonEditorialItems];

  for (let i = 1; i < arr.length; i++) {
    if (conflicts(arr[i - 1], arr[i]) && i + 1 < arr.length) {
      const tmp = arr[i];
      arr[i] = arr[i + 1];
      arr[i + 1] = tmp;
    }
  }

  const capped: FeedItem[] = [];
  let lastSpotlightPos = -MIN_SPOTLIGHT_GAP;
  for (const item of arr) {
    if (item.kind === "building_spotlight") {
      if (capped.length - lastSpotlightPos >= MIN_SPOTLIGHT_GAP) {
        lastSpotlightPos = capped.length;
        capped.push(item);
      }
    } else {
      capped.push(item);
    }
  }

  return capped;
}
