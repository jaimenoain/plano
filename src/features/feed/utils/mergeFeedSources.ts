import type { FeedItem } from "@/types/feedItem";
import { scoreFeedItem } from "./scoreFeedItem";

/**
 * Combines items from all three feed sources, applies ring-weighted scoring
 * (via scoreFeedItem), and returns the merged sorted array.
 *
 * Sources:
 *   social      — ring='direct', pre-scored by get_feed_ranked
 *   collections — ring='direct', freshness-scored
 *   discovery   — ring='open', freshness/engagement-scored
 *
 * Decision: Option B (client-side merge). Three parallel RPCs rather than one
 * unified RPC because the sources have different schemas and the application
 * layer is the right place to enforce diversity policy (Operating Principle #6).
 */
export function mergeFeedSources(
  social: FeedItem[],
  collections: FeedItem[],
  discovery: FeedItem[],
  hasSeen: (id: string) => boolean,
): FeedItem[] {
  return scoreFeedItem([...social, ...collections, ...discovery], hasSeen);
}
