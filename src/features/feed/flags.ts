/**
 * Feed v2 feature flag. Default-on as of Phase 3 ship.
 *
 * Kill-switch (browser console):
 *   localStorage.setItem('feed_v2_ranker', 'false')  // force off
 *   localStorage.removeItem('feed_v2_ranker')         // restore default (on)
 */
export function isFeedV2RankerEnabled(): boolean {
  try {
    const stored = localStorage.getItem("feed_v2_ranker");
    return stored !== "false";
  } catch {
    return true;
  }
}
