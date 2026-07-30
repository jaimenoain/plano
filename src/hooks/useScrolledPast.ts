/**
 * useScrolledPast.ts
 *
 * Reports whether a sentinel has passed out of the top of a scroll container —
 * the signal sticky chrome needs to know it is actually stuck, so it can earn
 * its lift (and reveal a condensed title) only once the block above it is gone.
 *
 * The shared `useIntersectionObserver` cannot serve this: it exposes a callback
 * ref and reports the positive ("is visible"), while stuck chrome needs the
 * inverse, and needs the observer rooted on an inner scroller rather than the
 * document viewport. Same hand-rolled idiom as the building-detail tab bar,
 * with the root made explicit.
 */
import { useEffect, useRef, useState, type RefObject } from "react";

export function useScrolledPast<T extends HTMLElement = HTMLDivElement>(
  /** The `overflow-y-auto` element the sentinel scrolls inside. */
  rootRef: RefObject<HTMLElement | null>,
) {
  const sentinelRef = useRef<T>(null);
  const [hasScrolledPast, setHasScrolledPast] = useState(false);

  useEffect(() => {
    // SSR: no observer, so the chrome renders in its at-rest state and settles
    // on hydration.
    if (typeof IntersectionObserver === "undefined") return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHasScrolledPast(!entry.isIntersecting),
      { root: rootRef.current, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [rootRef]);

  return { sentinelRef, hasScrolledPast };
}
