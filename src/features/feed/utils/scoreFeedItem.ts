import type { FeedItem, FeedItemRing } from "@/types/feedItem";

/**
 * Ring multipliers — applied BEFORE diversity and seen penalties.
 *
 * These encode the concentric-ring preference: direct-graph content (followed
 * users, saved buildings) is strongly preferred over open/discovery content.
 * Editorial slots (Photo of the Day, On This Day) sit between direct and open.
 *
 * Values match the roadmap spec (Phase 2):
 *   direct: 3.0 · extended: 1.5 · open: 1.0 · editorial: 2.0
 */
const RING_MULTIPLIER: Record<FeedItemRing, number> = {
  direct: 3.0,
  extended: 1.5,
  open: 1.0,
  editorial: 2.0,
};

/**
 * Re-ranks a pre-scored array of feed items by applying ring-weighted scoring
 * followed by client-side penalties.
 *
 * Applied in order:
 *   1. Ring multiplier — item.score × RING_MULTIPLIER[item.ring]
 *   2. Diversity penalty — items beyond the first by the same author get
 *      multiplied by 0.6^N (N = how many prior items share the same author).
 *      Same decay applied per building_id.
 *   3. Seen penalty — items where `hasSeen(id)` returns true get ×0.3.
 *
 * The input array is assumed to be sorted by raw RPC score descending.
 * All adjustments are applied, then the output is re-sorted.
 *
 * Pure function — does not mutate input items.
 */
export function scoreFeedItem(
  items: FeedItem[],
  hasSeen: (id: string) => boolean,
): FeedItem[] {
  const authorCount = new Map<string, number>();
  const buildingCount = new Map<string, number>();

  const withPenalties = items.map((item) => {
    const authorId =
      item.kind === "post" ? (item.payload.user?.username ?? "") : "";
    const buildingId =
      item.kind === "post" ? (item.payload.building?.id ?? "") : "";

    const authorN = authorCount.get(authorId) ?? 0;
    const buildingN = buildingCount.get(buildingId) ?? 0;

    // Ring multiplier applied first — sets the base weight for the ring
    const ringMultiplier = RING_MULTIPLIER[item.ring] ?? 1.0;

    // 0.6^0 = 1.0 (no penalty for first item), 0.6^1 = 0.6, 0.6^2 = 0.36 …
    const authorPenalty = Math.pow(0.6, authorN);
    const buildingPenalty = Math.pow(0.6, buildingN);
    const seenPenalty = hasSeen(item.id) ? 0.3 : 1.0;

    const adjustedScore =
      item.score * ringMultiplier * authorPenalty * buildingPenalty * seenPenalty;

    // Increment counters for subsequent items with the same key
    if (authorId) authorCount.set(authorId, authorN + 1);
    if (buildingId) buildingCount.set(buildingId, buildingN + 1);

    return { item, adjustedScore };
  });

  return withPenalties
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
    .map(({ item, adjustedScore }) => ({ ...item, score: adjustedScore }));
}
