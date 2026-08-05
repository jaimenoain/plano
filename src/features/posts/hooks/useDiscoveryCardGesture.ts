/**
 * useDiscoveryCardGesture — the pointer engine behind an Explore card.
 *
 * Replaces Framer's `drag="x"` + `dragDirectionLock`, which fought iPad Safari: with
 * `touch-pan-y` underneath, vertical feed movement and horizontal save/hide were
 * routinely misclassified (worse in portrait). Here the first decisive axis wins for
 * the rest of the pointer, and `x` only moves once horizontal dominance is explicit.
 *
 * Both axes are handled. The vertical half is forwarded to the feed pager rather than
 * released to a native scroller — Explore no longer has one, precisely because iOS
 * momentum used to carry a single flick across several buildings.
 */
import { useCallback, useEffect, useRef } from "react";
import { animate, type MotionValue } from "framer-motion";
import {
  applyElasticPull,
  computeElasticLimit,
  computeSwipeThresholds,
  computeVelocity,
  computeVerticalVelocity,
  decideAxis,
  resolveSwipeCommit,
  type MoveSample,
} from "../utils/swipeGesture";

/** Fallback card width before the first pointerdown captures a real measurement. */
export const FALLBACK_CARD_WIDTH = 375;
/**
 * Lower than the old hard-coded 0.04s so a fast, short flick still registers a
 * velocity instead of springing back and feeling dead (see computeVelocity).
 */
const VELOCITY_DT_GATE = 0.016;
/** Pull past which the gesture swallows the click that would page the gallery. */
const TAP_BLOCK_PULL_PX = 12;

interface Options {
  /** The card's horizontal offset; the hook writes to it during a horizontal drag. */
  x: MotionValue<number>;
  /** Card width, kept fresh on every pointerdown for the width-scaled thresholds. */
  cardWidthRef: React.MutableRefObject<number>;
  prefersReducedMotion: boolean;
  /** True while the rating overlay is up — the card must not be draggable then. */
  disabled: boolean;
  onInteractionStart?: () => void;
  onCommitSave: () => void;
  onCommitHide?: (el: HTMLElement) => void;
  onVerticalDrag?: (dy: number) => void;
  onVerticalRelease?: (dy: number, vy: number) => void;
  /** The card root, for the non-passive touchmove blocker. */
  rootRef: React.MutableRefObject<HTMLDivElement | null>;
}

export function useDiscoveryCardGesture({
  x,
  cardWidthRef,
  prefersReducedMotion,
  disabled,
  onInteractionStart,
  onCommitSave,
  onCommitHide,
  onVerticalDrag,
  onVerticalRelease,
  rootRef,
}: Options) {
  /**
   * True from the moment the axis locks until the pointer ends. Read by the
   * permanently-attached touchmove blocker: state-driven attachment left a 1-frame
   * gap on iPad Safari during which a native scroll could commit first.
   */
  const gestureActiveRef = useRef(false);
  /** Set when a drag was decisive enough that the closing click isn't a tap. */
  const blockImageTapRef = useRef(false);

  const session = useRef<{
    activePointerId: number | null;
    /** undecided → first axis wins for the rest of the pointer */
    axis: "undecided" | "horizontal" | "vertical";
    originX: number;
    originY: number;
    /** timeStamp of pointerdown — seeds the velocity baseline for fast flicks. */
    originT: number;
    moveSamples: MoveSample[];
    /** Card width captured at gesture start — feeds the scaled commit thresholds. */
    width: number;
  }>({
    activePointerId: null,
    axis: "undecided",
    originX: 0,
    originY: 0,
    originT: 0,
    moveSamples: [],
    width: 0,
  });

  const endSession = useCallback(() => {
    const s = session.current;
    s.activePointerId = null;
    s.axis = "undecided";
    s.moveSamples = [];
    s.width = 0;
    gestureActiveRef.current = false;
  }, []);

  const releaseCapture = useCallback((el: HTMLElement, pid: number | null) => {
    if (pid == null || !el.hasPointerCapture(pid)) return;
    try {
      el.releasePointerCapture(pid);
    } catch {
      /* already released */
    }
  }, []);

  const springBack = useCallback(() => {
    if (prefersReducedMotion) x.set(0);
    else void animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
  }, [prefersReducedMotion, x]);

  const finishHorizontal = useCallback(
    (el: HTMLElement) => {
      const s = session.current;
      const pull = x.get();
      const width = s.width || el.clientWidth || FALLBACK_CARD_WIDTH;
      const vx = computeVelocity(s.moveSamples, VELOCITY_DT_GATE);
      const commit = resolveSwipeCommit(pull, vx, computeSwipeThresholds(width));

      if (Math.abs(pull) > TAP_BLOCK_PULL_PX) blockImageTapRef.current = true;

      if (commit === "right") onCommitSave();
      else if (commit === "left" && onCommitHide) onCommitHide(el);
      else springBack();

      releaseCapture(el, s.activePointerId);
      endSession();
    },
    [endSession, onCommitHide, onCommitSave, releaseCapture, springBack, x]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.button !== 0) return;
      if (e.pointerType === "touch" && !e.isPrimary) return;

      const s = session.current;
      s.activePointerId = e.pointerId;
      s.axis = "undecided";
      s.originX = e.clientX;
      s.originY = e.clientY;
      s.originT = e.timeStamp;
      s.moveSamples = [{ t: e.timeStamp, x: e.clientX }];
      s.width = e.currentTarget.clientWidth;
      cardWidthRef.current = e.currentTarget.clientWidth || FALLBACK_CARD_WIDTH;
      blockImageTapRef.current = false;
    },
    [cardWidthRef, disabled]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = session.current;
      if (s.activePointerId == null || e.pointerId !== s.activePointerId) return;
      if (disabled) return;

      const dx = e.clientX - s.originX;
      const dy = e.clientY - s.originY;
      const elasticLimit = computeElasticLimit(s.width || FALLBACK_CARD_WIDTH);

      if (s.axis === "vertical") {
        e.preventDefault();
        s.moveSamples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
        if (s.moveSamples.length > 8) s.moveSamples.shift();
        onVerticalDrag?.(dy);
        return;
      }

      if (s.axis === "horizontal") {
        e.preventDefault();
        s.moveSamples.push({ t: e.timeStamp, x: e.clientX });
        if (s.moveSamples.length > 8) s.moveSamples.shift();
        x.set(applyElasticPull(dx, elasticLimit));
        return;
      }

      const axis = decideAxis({ dx, dy, pointerType: e.pointerType });
      if (axis === "undecided") return;
      // Nothing underneath scrolls natively any more — the feed is a controlled
      // pager — so the card drives navigation for the rest of this pointer too.
      if (axis === "vertical" && !onVerticalDrag) {
        s.axis = "vertical";
        return;
      }

      s.axis = axis;
      onInteractionStart?.();
      gestureActiveRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      // Seed the velocity buffer from the gesture origin so a fast, short flick
      // still has two timestamped samples to measure against.
      s.moveSamples = [
        { t: s.originT, x: s.originX, y: s.originY },
        { t: e.timeStamp, x: e.clientX, y: e.clientY },
      ];
      e.preventDefault();
      if (axis === "vertical") onVerticalDrag?.(dy);
      else x.set(applyElasticPull(dx, elasticLimit));
    },
    [disabled, onInteractionStart, onVerticalDrag, x]
  );

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = session.current;
      if (s.activePointerId == null || e.pointerId !== s.activePointerId) return;

      if (s.axis === "horizontal") {
        finishHorizontal(e.currentTarget);
        return;
      }
      if (s.axis === "vertical" && onVerticalRelease) {
        onVerticalRelease(
          e.clientY - s.originY,
          computeVerticalVelocity(s.moveSamples, VELOCITY_DT_GATE)
        );
        releaseCapture(e.currentTarget, s.activePointerId);
      }
      endSession();
    },
    [endSession, finishHorizontal, onVerticalRelease, releaseCapture]
  );

  /**
   * Belt-and-braces against iOS rubber-banding the page while a gesture is live.
   * The card is `touch-none` and nothing above it scrolls natively, but the blocker
   * is attached once on mount (not on state change) so there is no frame in which
   * iPad Safari can start a scroll we then have to fight.
   */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const preventTouchScroll = (ev: TouchEvent) => {
      if (gestureActiveRef.current && ev.cancelable) ev.preventDefault();
    };
    el.addEventListener("touchmove", preventTouchScroll, { passive: false });
    return () => el.removeEventListener("touchmove", preventTouchScroll);
  }, [rootRef]);

  return { onPointerDown, onPointerMove, onPointerEnd, blockImageTapRef };
}
