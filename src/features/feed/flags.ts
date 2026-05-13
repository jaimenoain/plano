/**
 * Feed v2 feature flag.
 *
 * Toggle in the browser console:
 *   localStorage.setItem('feed_v2_ranker', 'true')  // enable
 *   localStorage.removeItem('feed_v2_ranker')        // disable
 *
 * Phase 1: ranked feed (get_feed_ranked) instead of reverse-chronological.
 * Phase 2: unified ranked stream from three sources; no cold-start fork.
 * Phase 3: mosaic grid layout replaces the flex column in the V2 path.
 * Will be flipped to default-on once QA passes for 0, 5, and 50+ follow users.
 */
export function isFeedV2RankerEnabled(): boolean {
  try {
    return localStorage.getItem("feed_v2_ranker") === "true";
  } catch {
    return false;
  }
}
