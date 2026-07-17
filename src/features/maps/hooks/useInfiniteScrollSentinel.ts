import { useCallback, useEffect, useRef } from 'react';

interface UseInfiniteScrollSentinelOptions {
  /** Wire the observer only while true (e.g. browse mode with rows present). */
  enabled: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Whole-query fetching flag — pauses the auto-fill probe mid-refetch. */
  isFetching: boolean;
  fetchNextPage: () => void;
  /** Changes when a page settles (e.g. `data.pages.length`) — re-runs auto-fill. */
  pageCount: number | undefined;
}

/**
 * Infinite-scroll for a sentinel that lives inside a scroll container (not the
 * window). Returns a `targetRef` for the sentinel and a `rootRef` for the
 * scroll viewport.
 *
 * Two things the naive version gets wrong:
 *  - The observer `root` MUST be the scroll viewport. With the default
 *    `root: null` (browser viewport), scrolling an inner overflow container
 *    never trips the sentinel. `rootMargin` prefetches ~one screen early.
 *  - The observer is created ONCE (per `enabled` toggle) and reads the latest
 *    pagination action from a ref. Rebuilding it on every `hasNextPage`/data
 *    change — which churns dozens of times per second during a map settle —
 *    disconnects each observer before its async first delivery, so the callback
 *    never fires and the list freezes on page 1.
 */
export function useInfiniteScrollSentinel({
  enabled,
  hasNextPage,
  isFetchingNextPage,
  isFetching,
  fetchNextPage,
  pageCount,
}: UseInfiniteScrollSentinelOptions) {
  const targetRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (enabled && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage]);
  const loadMoreRef = useRef(loadMore);
  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  useEffect(() => {
    if (!enabled) return;
    const target = targetRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreRef.current(); },
      { root: rootRef.current ?? null, rootMargin: '400px', threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled]);

  // Auto-fill: if page 1 doesn't overflow the viewport the sentinel is already
  // visible and no scroll will ever come, so pull pages until it overflows (a
  // scroll becomes possible) or results run out. Skips a hidden viewport
  // (clientHeight 0 — e.g. the off-screen mobile sidebar) so it can't runaway.
  useEffect(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage || isFetching) return;
    const viewport = rootRef.current;
    if (!viewport || viewport.clientHeight === 0) return;
    if (viewport.scrollHeight <= viewport.clientHeight + 1) fetchNextPage();
  }, [enabled, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, pageCount]);

  return { targetRef, rootRef };
}
