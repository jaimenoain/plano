import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate every cache that reads a member's `user_buildings` row for one
 * building. Any write to that table — status, award, note save, removal —
 * moves all three at once, so they are invalidated together rather than
 * remembered separately at each call site:
 *
 *   - `user-building-statuses` — the viewer's own status/award maps
 *   - `map-clusters-v3` — pin rank and colour on every map
 *   - `building-activity` — the detail page's "Saved & visited" section, which lists
 *     the viewer alongside everyone else who saved or visited
 */
export function invalidateBuildingCaches(
  queryClient: QueryClient,
  buildingId: string,
) {
  queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
  queryClient.invalidateQueries({ queryKey: ["map-clusters-v3"] });
  queryClient.invalidateQueries({ queryKey: ["building-activity", buildingId] });
}
