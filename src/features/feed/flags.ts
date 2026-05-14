/**
 * Feed v2 is fully shipped (Phases 0–7 complete). Flag removed per post-rebuild
 * cleanup in FEED_REDESIGN_ROADMAP.md. Always returns true; retained as a shim
 * so any stale import sites compile without changes until they are cleaned up.
 */
export function isFeedV2RankerEnabled(): boolean {
  return true;
}
