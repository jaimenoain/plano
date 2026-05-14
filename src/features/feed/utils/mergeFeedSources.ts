import type { FeedItem } from "@/types/feedItem";
import { scoreFeedItem } from "./scoreFeedItem";

/**
 * Combines items from all feed sources, applies ring-weighted scoring
 * (via scoreFeedItem), deduplicates posts that appear inside clusters,
 * and returns the merged sorted array.
 *
 * Sources:
 *   social      — ring='direct', pre-scored by get_feed_ranked
 *   collections — ring='direct', freshness-scored
 *   discovery   — ring='open', freshness/engagement-scored
 *   extended    — ring='extended', liked-by-follows (Phase 4, ring-2)
 *   spotlights  — ring='direct'|'open', building activity cards (Phase 5)
 *   editorial   — ring='editorial', rotation-tier slots (Phase 6)
 *   clusters    — ring='direct', moment cluster cards (Phase 7)
 *
 * Deduplication (Phase 7): when a moment_cluster item is included, the post
 * ids covered by that cluster's lead + supporting posts are removed from all
 * standalone `post` sources. This prevents the same post appearing both as a
 * standalone tile and inside a cluster card on the same page.
 *
 * Decision: Option B (client-side merge). Parallel RPCs rather than one
 * unified RPC because the sources have different schemas and the application
 * layer is the right place to enforce diversity policy (Operating Principle #6).
 *
 * Call signatures:
 *   5-arg (legacy): (social, collections, discovery, extended, hasSeen)
 *   6-arg (Phase 5): (social, collections, discovery, extended, spotlights, hasSeen)
 *   7-arg (Phase 6): (social, collections, discovery, extended, spotlights, hasSeen, editorial)
 *   8-arg (Phase 7): (social, collections, discovery, extended, spotlights, hasSeen, editorial, clusters)
 */
export function mergeFeedSources(
  social: FeedItem[],
  collections: FeedItem[],
  discovery: FeedItem[],
  extended: FeedItem[],
  spotlightsOrHasSeen: FeedItem[] | ((id: string) => boolean),
  hasSeen?: (id: string) => boolean,
  editorial?: FeedItem[],
  clusters?: FeedItem[],
): FeedItem[] {
  // Support both 5-arg (legacy) and 6/7/8-arg call signatures.
  const spotlights = typeof spotlightsOrHasSeen === "function" ? [] : spotlightsOrHasSeen;
  const seenFn = typeof spotlightsOrHasSeen === "function" ? spotlightsOrHasSeen : (hasSeen ?? (() => false));

  const clusterItems = clusters ?? [];

  // Collect all post ids that are claimed by cluster cards so we can suppress
  // them from the standalone pools — no post should appear both as its own tile
  // and inside a cluster card on the same page.
  const clusteredPostIds = new Set<string>();
  for (const item of clusterItems) {
    if (item.kind === "moment_cluster") {
      clusteredPostIds.add(item.leadPost.id);
      for (const sp of item.supportingPosts) {
        clusteredPostIds.add(sp.id);
      }
    }
  }

  // Filter standalone post items that are already claimed by a cluster.
  const deduped = (items: FeedItem[]): FeedItem[] =>
    items.filter((item) => !(item.kind === "post" && clusteredPostIds.has(item.id)));

  return scoreFeedItem(
    [
      ...deduped(social),
      ...deduped(collections),
      ...deduped(discovery),
      ...deduped(extended),
      ...spotlights,
      ...(editorial ?? []),
      ...clusterItems,
    ],
    seenFn,
  );
}
