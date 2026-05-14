import type { FeedItem } from "@/types/feedItem";
import { scoreFeedItem } from "./scoreFeedItem";

/**
 * Combines items from all feed sources, applies ring-weighted scoring
 * (via scoreFeedItem), and returns the merged sorted array.
 *
 * Sources:
 *   social      — ring='direct', pre-scored by get_feed_ranked
 *   collections — ring='direct', freshness-scored
 *   discovery   — ring='open', freshness/engagement-scored
 *   extended    — ring='extended', liked-by-follows (Phase 4, ring-2)
 *   spotlights  — ring='direct'|'open', building activity cards (Phase 5)
 *   editorial   — ring='editorial', rotation-tier slots (Phase 6)
 *
 * Decision: Option B (client-side merge). Parallel RPCs rather than one
 * unified RPC because the sources have different schemas and the application
 * layer is the right place to enforce diversity policy (Operating Principle #6).
 *
 * Call signatures:
 *   5-arg (legacy): (social, collections, discovery, extended, hasSeen)
 *   6-arg (Phase 5): (social, collections, discovery, extended, spotlights, hasSeen)
 *   7-arg (Phase 6): (social, collections, discovery, extended, spotlights, hasSeen, editorial)
 */
export function mergeFeedSources(
  social: FeedItem[],
  collections: FeedItem[],
  discovery: FeedItem[],
  extended: FeedItem[],
  spotlightsOrHasSeen: FeedItem[] | ((id: string) => boolean),
  hasSeen?: (id: string) => boolean,
  editorial?: FeedItem[],
): FeedItem[] {
  // Support both 5-arg (legacy) and 6/7-arg call signatures.
  const spotlights = typeof spotlightsOrHasSeen === "function" ? [] : spotlightsOrHasSeen;
  const seenFn = typeof spotlightsOrHasSeen === "function" ? spotlightsOrHasSeen : (hasSeen ?? (() => false));

  return scoreFeedItem(
    [...social, ...collections, ...discovery, ...extended, ...spotlights, ...(editorial ?? [])],
    seenFn,
  );
}
