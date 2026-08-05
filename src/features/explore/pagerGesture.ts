/**
 * pagerGesture.ts — pure math for Explore's vertical feed pager.
 *
 * The feed used to be a native `snap-y snap-mandatory` scroller. On iPad Safari a
 * single flick's momentum carried across three or four snap children before settling,
 * so the user blew past buildings they never saw — and because passing a card marked
 * it `ignored`, those buildings were lost for good. The feed is now a controlled
 * pager: one gesture moves exactly one building, in either direction, always.
 *
 * Side-effect free and framework-free so the commit rules can be unit-tested; the
 * horizontal save/hide half of the gesture lives in the card's own `swipeGesture.ts`.
 */

/** Velocity (px/s) past which a vertical flick advances one building. */
export const PAGER_VELOCITY_PX = 420;
/** Fraction of the viewport height that commits a page step on distance alone. */
export const PAGER_OFFSET_FRACTION = 0.15;
/** Resistance applied to a drag that would pull past the first or last building. */
export const PAGER_EDGE_LIMIT = 48;
/** How much of the overpull past the edge limit still tracks the finger. */
export const PAGER_EDGE_DAMPING = 0.32;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Page-commit thresholds scale with the feed height, clamped so the gesture stays
 * reachable on a short phone and doesn't demand a huge drag on a tall iPad.
 */
export function computePagerThresholds(heightPx: number): {
  offset: number;
  velocity: number;
} {
  return {
    offset: clamp(heightPx * PAGER_OFFSET_FRACTION, 56, 160),
    velocity: PAGER_VELOCITY_PX,
  };
}

/**
 * Damped overpull at the ends of the feed: the finger keeps tracking, but the track
 * never exposes empty space above the first or below the last building.
 */
export function applyEdgeResistance(dy: number): number {
  const abs = Math.abs(dy);
  if (abs <= PAGER_EDGE_LIMIT) return dy;
  const over = abs - PAGER_EDGE_LIMIT;
  return Math.sign(dy) * (PAGER_EDGE_LIMIT + over * PAGER_EDGE_DAMPING);
}

/**
 * Resolve a completed vertical drag to at most a single page step.
 *
 * Screen coordinates grow downward, so dragging *up* (negative `dy`) pulls the next
 * building into view. Returning a step of ±1 — never ±2 — is the whole point: no
 * amount of flick speed can skip a building.
 */
export function resolvePagerCommit(
  dy: number,
  vy: number,
  thresholds: { offset: number; velocity: number }
): "next" | "prev" | "none" {
  if (dy < -thresholds.offset || vy < -thresholds.velocity) return "next";
  if (dy > thresholds.offset || vy > thresholds.velocity) return "prev";
  return "none";
}
