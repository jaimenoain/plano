/**
 * Feed v2 feature flag.
 *
 * Toggle in the browser console:
 *   localStorage.setItem('feed_v2_ranker', 'true')  // enable
 *   localStorage.removeItem('feed_v2_ranker')        // disable
 *
 * Phase 1: ranked feed (get_feed_ranked) instead of reverse-chronological.
 * Phase 2: unified ranked stream from three sources; no cold-start fork.
 *
 * Will be flipped to default-on in Phase 3 once QA passes.
 */
export function isFeedV2RankerEnabled(): boolean {
  try {
    return localStorage.getItem("feed_v2_ranker") === "true";
  } catch {
    return false;
  }
}
