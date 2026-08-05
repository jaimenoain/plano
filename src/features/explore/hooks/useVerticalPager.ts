/**
 * useVerticalPager — one-building-per-gesture vertical navigation for Explore.
 *
 * Replaces the native `snap-y snap-mandatory` scroller. iOS Safari momentum cannot be
 * cancelled once a flick is released, so a hard swipe used to carry across three or
 * four snap children; combined with the "scrolled past = ignored" write, a single
 * flick permanently consumed several buildings. Here the container doesn't scroll at
 * all: we own an index and translate the track ourselves, and a gesture resolves to at
 * most ±1 (see `resolvePagerCommit`).
 *
 * The gesture itself is captured by the card, whose engine (`useDiscoveryCardGesture`)
 * already owns pointer capture and axis locking; it forwards the vertical half here
 * via `onDrag`/`onRelease`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import {
  applyEdgeResistance,
  clamp,
  computePagerThresholds,
  resolvePagerCommit,
} from "../pagerGesture";

export interface VerticalPager {
  index: number;
  /** Track offset in px — bind to the motion track's `y`. */
  y: ReturnType<typeof useMotionValue<number>>;
  /** Live finger delta for the current vertical drag (px, negative = pulling up). */
  onDrag: (dy: number) => void;
  /** Commit a released vertical drag to at most one page step. */
  onRelease: (dy: number, vy: number) => void;
  goToNext: () => void;
  goToPrev: () => void;
  /** Jump straight to a page without animating — used when the queue is rebuilt. */
  reset: () => void;
}

export function useVerticalPager({
  count,
  containerRef,
}: {
  count: number;
  containerRef: React.RefObject<HTMLElement | null>;
}): VerticalPager {
  const [index, setIndex] = useState(0);
  const y = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion() ?? false;

  /** Measured feed height; drives both the track offset and the commit threshold. */
  const heightRef = useRef(0);
  const indexRef = useRef(0);
  indexRef.current = index;
  /**
   * `count` grows every time a page lands. Reading it through a ref keeps every
   * returned callback referentially stable — otherwise `reset` would get a new
   * identity mid-session and any effect depending on it would fire, throwing the
   * user back to the first building just as the next page arrived.
   */
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const next = el.clientHeight;
      if (next === heightRef.current) return;
      heightRef.current = next;
      // Re-anchor immediately: an orientation change must not leave the track
      // parked between two buildings.
      y.set(-indexRef.current * next);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, y]);

  /** Settle the track on whichever page is current (after a commit, or a queue reset). */
  const settle = useCallback(
    (target: number, animated: boolean) => {
      const destination = -target * heightRef.current;
      if (!animated || prefersReducedMotion) {
        y.set(destination);
        return;
      }
      void animate(y, destination, {
        type: "spring",
        stiffness: 420,
        damping: 42,
      });
    },
    [prefersReducedMotion, y]
  );

  const goTo = useCallback(
    (target: number, animated = true) => {
      const clamped = clamp(target, 0, Math.max(0, countRef.current - 1));
      setIndex(clamped);
      settle(clamped, animated);
    },
    [settle]
  );

  const onDrag = useCallback(
    (dy: number) => {
      const h = heightRef.current;
      const i = indexRef.current;
      // At the first/last building there is nothing to reveal, so the drag gets
      // rubber-banded instead of exposing empty space.
      const atStart = i === 0 && dy > 0;
      const atEnd = i >= countRef.current - 1 && dy < 0;
      const offset = atStart || atEnd ? applyEdgeResistance(dy) : dy;
      y.set(-i * h + offset);
    },
    [y]
  );

  const onRelease = useCallback(
    (dy: number, vy: number) => {
      const commit = resolvePagerCommit(
        dy,
        vy,
        computePagerThresholds(heightRef.current || window.innerHeight)
      );
      const step = commit === "next" ? 1 : commit === "prev" ? -1 : 0;
      goTo(indexRef.current + step);
    },
    [goTo]
  );

  const goToNext = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const goToPrev = useCallback(() => goTo(indexRef.current - 1), [goTo]);
  const reset = useCallback(() => goTo(0, false), [goTo]);

  // The queue can shrink under us (a filter narrows the result set) — never leave the
  // index pointing past the end.
  useEffect(() => {
    if (count > 0 && indexRef.current > count - 1) goTo(count - 1, false);
  }, [count, goTo]);

  return { index, y, onDrag, onRelease, goToNext, goToPrev, reset };
}
