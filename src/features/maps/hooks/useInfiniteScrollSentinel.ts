import { useCallback, useEffect, useRef, type RefObject } from 'react';

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
  /**
   * The scroll viewport when the caller doesn't own it — e.g. the collection
   * rail, where masthead, toolbar and list share ONE scroller owned by the page.
   * When supplied the observer roots here and the returned `rootRef` goes unused.
   *
   * Be aware the geometric auto-fill probe measures whatever root it is given: a
   * shared scroller that already overflows for reasons of its own (a masthead,
   * say) reads as "a scroll is possible" and the probe stays silent even if the
   * list itself is empty. Callers in that position need a content-level top-up
   * of their own — see `useCollectionDiscoverInView`.
   */
  scrollRootRef?: RefObject<HTMLElement | null>;
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
  scrollRootRef,
}: UseInfiniteScrollSentinelOptions) {
  const targetRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // A caller-supplied scroller wins. Both sides are ref objects, so this holder
  // is stable across renders and the observer effect keeps its narrow deps.
  const viewportRef = useRef<RefObject<HTMLElement | null>>(rootRef);
  viewportRef.current = scrollRootRef ?? rootRef;

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
      { root: viewportRef.current.current ?? null, rootMargin: '400px', threshold: 0 }
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
    const viewport = viewportRef.current.current;
    if (!viewport || viewport.clientHeight === 0) return;
    if (viewport.scrollHeight <= viewport.clientHeight + 1) fetchNextPage();
  }, [enabled, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, pageCount]);

  return { targetRef, rootRef };
}
