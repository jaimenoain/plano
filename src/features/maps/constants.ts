/**
 * Itinerary day routes are drawn in a single monochrome ink and separated by opacity,
 * not by hue — `screens/itinerary.html` strokes Day 1 at 0.6 and Day 2 at 0.35 over the
 * same `#171717`. Days beyond the ladder wrap around.
 *
 * (This replaces a `DAY_COLORS` array of eight identical lime strings, which both broke
 * the monochrome-marker rule and gave no day separation at all.)
 */
export const DAY_ROUTE_OPACITY = [0.6, 0.45, 0.35, 0.28] as const;

export function getDayRouteOpacity(dayIndex: number): number {
  return DAY_ROUTE_OPACITY[dayIndex % DAY_ROUTE_OPACITY.length];
}
