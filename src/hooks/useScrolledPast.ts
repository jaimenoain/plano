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
import { useEffect, useState, type RefObject } from "react";

export function useScrolledPast<T extends HTMLElement = HTMLDivElement>(
  /** The `overflow-y-auto` element the sentinel scrolls inside. */
  rootRef: RefObject<HTMLElement | null>,
) {
  // A callback ref, not a `useRef` object, because the sentinel usually mounts
  // *later* than the hook: a page that renders a loading state first has no
  // sentinel on the effect's only pass, and a ref object mutating from null to
  // a node re-runs nothing — the observer would never be created and the chrome
  // would stay at rest forever. Holding the node in state re-runs the effect the
  // moment it appears.
  const [sentinel, setSentinel] = useState<T | null>(null);
  const [hasScrolledPast, setHasScrolledPast] = useState(false);

  useEffect(() => {
    // SSR: no observer, so the chrome renders in its at-rest state and settles
    // on hydration.
    if (typeof IntersectionObserver === "undefined") return;

    if (!sentinel) return;

    // Read the root here rather than in the ref callback: refs attach
    // children-first, so the scroller (the sentinel's parent) is still null at
    // that point, and rooting on the viewport would fire at the wrong moment.
    const observer = new IntersectionObserver(
      ([entry]) => setHasScrolledPast(!entry.isIntersecting),
      { root: rootRef.current, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, rootRef]);

  return { sentinelRef: setSentinel, hasScrolledPast };
}
