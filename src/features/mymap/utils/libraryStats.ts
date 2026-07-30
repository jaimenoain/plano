/**
 * Pure aggregation for the /map stats masthead. No React, no data access —
 * takes the library rows the rail API already fetches and reduces them to the
 * five figures the masthead shows.
 */
import type { LibraryPin } from "@/features/feed/api/railApi";
import { rollUpPlaces } from "@/features/feed";

export type LibraryStats = {
  visited: number;
  saved: number;
  /** Distinct places, city with country fallback — same rollup as the rail plate. */
  cities: number;
  countries: number;
  /** Sum of the member's 0–3 Masterpiece awards. */
  points: number;
};

export function computeLibraryStats(pins: LibraryPin[]): LibraryStats {
  let visited = 0;
  let saved = 0;
  let points = 0;
  const countries = new Set<string>();

  for (const pin of pins) {
    if (pin.status === "visited") visited += 1;
    else saved += 1;
    points += pin.rating ?? 0;
    const country = pin.country?.trim().toLowerCase();
    if (country) countries.add(country);
  }

  return {
    visited,
    saved,
    cities: rollUpPlaces(pins).placeCount,
    countries: countries.size,
    points,
  };
}
