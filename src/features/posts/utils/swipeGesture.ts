/**
 * swipeGesture.ts — pure math for the Explore card swipe engine.
 *
 * Extracted from DiscoveryCard so the gesture logic can be unit-tested and tuned
 * independently of React. Everything here is side-effect free.
 *
 * Cross-device design: the commit thresholds already scaled with card width; the
 * rotation range, elastic knee, and swipe-feedback reveal now scale too, calibrated
 * so a phone-sized card (~375px) reproduces the pre-refactor hard-coded feel
 * (rotation/elastic reached full range at ±200px; stamps revealed ±20px → ±100px).
 */

export interface MoveSample {
  t: number;
  x: number;
}

export type SwipeAxis = "undecided" | "horizontal" | "vertical";
export type SwipeDirection = "like" | "nope";

/** Velocity (px/s) past which a flick commits regardless of distance. */
export const SWIPE_VELOCITY_PX = 480;
/** Resistance applied to the portion of a drag past the elastic knee. */
export const ELASTIC_DAMPING = 0.32;
/** Elastic knee / rotation span never drop below this phone baseline. */
export const BASE_ELASTIC_LIMIT = 200;
/** Max card tilt (degrees) at full horizontal pull. */
export const ROTATION_MAX_DEG = 10;
/**
 * Fraction of card width at which rotation/elastic reach full range.
 * 200 / 375 ≈ 0.5333 keeps a phone-sized card identical to the old fixed ±200px.
 */
export const ROTATION_SPAN_FRACTION = 200 / 375;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Commit thresholds scale with card width so a wide card doesn't trip a save/hide
 * on a small horizontal drift. 18% of width, clamped phone-min → tablet-max.
 * Unchanged from the original inline implementation.
 */
export function computeSwipeThresholds(widthPx: number): {
  offset: number;
  velocity: number;
} {
  const offset = Math.max(88, Math.min(180, widthPx * 0.18));
  return { offset, velocity: SWIPE_VELOCITY_PX };
}

/** Elastic knee scales with card width but never below the phone baseline (200px). */
export function computeElasticLimit(widthPx: number): number {
  return Math.max(BASE_ELASTIC_LIMIT, widthPx * 0.5);
}

/**
 * Damped overpull beyond `limit`: the finger keeps tracking but with resistance,
 * so the card never flies to the screen edge on a hard drag.
 */
export function applyElasticPull(
  rawDx: number,
  limit: number = BASE_ELASTIC_LIMIT
): number {
  const abs = Math.abs(rawDx);
  if (abs <= limit) return rawDx;
  const over = abs - limit;
  return Math.sign(rawDx) * (limit + over * ELASTIC_DAMPING);
}

/** Pull distance at which rotation and swipe-feedback reach full strength. */
export function computeRotationSpan(widthPx: number): number {
  return Math.max(BASE_ELASTIC_LIMIT, widthPx * ROTATION_SPAN_FRACTION);
}

/** Card tilt in degrees for a given horizontal pull, proportional to card width. */
export function computeRotationDeg(pull: number, widthPx: number): number {
  const span = computeRotationSpan(widthPx);
  return clamp(pull / span, -1, 1) * ROTATION_MAX_DEG;
}

/**
 * Opacity of a swipe-feedback stamp/overlay for the given pull.
 * Reveals from 10% → 50% of the rotation span (phone: ±20px → ±100px), so the
 * stamp is fully lit around the commit point on any screen size.
 */
export function computeStampOpacity(
  pull: number,
  widthPx: number,
  direction: SwipeDirection
): number {
  const span = computeRotationSpan(widthPx);
  const start = span * 0.1;
  const full = span * 0.5;
  const signed = direction === "like" ? pull : -pull;
  return clamp((signed - start) / (full - start), 0, 1);
}

/**
 * Axis gating: the first decisive axis wins for the rest of the pointer.
 * Touch gets wider arms + a stricter horizontal ratio so finger drift during a
 * vertical fling isn't misread as a save/hide; vertical wins ties so feed scroll
 * always feels responsive. Identical thresholds to the original inline logic.
 */
export function decideAxis({
  dx,
  dy,
  pointerType,
}: {
  dx: number;
  dy: number;
  pointerType: string;
}): SwipeAxis {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < 8 && absDy < 8) return "undecided";

  const touch = pointerType === "touch";
  const armH = touch ? 32 : 12;
  const armV = touch ? 18 : 10;
  const hRatio = touch ? 1.7 : 1.2;
  const vRatio = touch ? 1.25 : 1.2;

  if (absDy >= armV && absDy > absDx * vRatio) return "vertical";
  if (absDx >= armH && absDx > absDy * hRatio) return "horizontal";
  return "undecided";
}

/**
 * Horizontal fling velocity (px/s) from recent move samples. Returns 0 until there
 * are two samples spanning more than `dtGate` seconds. A lower gate than the old
 * hard-coded 0.04 lets a fast, short flick register instead of feeling dead.
 */
export function computeVelocity(
  samples: MoveSample[],
  dtGate = 0.04
): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const first = samples[0];
  const dt = (last.t - first.t) / 1000;
  if (dt <= dtGate) return 0;
  return (last.x - first.x) / dt;
}

/** Whether a completed swipe commits, given the final pull and fling velocity. */
export function resolveSwipeCommit(
  pull: number,
  velocity: number,
  thresholds: { offset: number; velocity: number }
): "right" | "left" | "none" {
  if (pull > thresholds.offset || velocity > thresholds.velocity) return "right";
  if (pull < -thresholds.offset || velocity < -thresholds.velocity) return "left";
  return "none";
}
