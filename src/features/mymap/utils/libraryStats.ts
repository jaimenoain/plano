/**
 * Pure aggregation for the /map stats masthead. No React, no data access —
 * takes the library rows the rail API already fetches and reduces them to the
 * five figures the masthead shows.
 */
import type { LibraryPin } from "@/features/feed/api/railApi";

export type LibraryStats = {
  visited: number;
  saved: number;
  /** Distinct places, city with country fallback — same rollup as the rail plate. */
  cities: number;
  countries: number;
  /** Sum of the member's 0–3 Masterpiece awards. */
  points: number;
};

/**
 * Distinct places by city, falling back to country when the city is
 * missing — the masthead's "cities" figure. Counts every pin, mappable or
 * not: a building with no coordinates still belongs to a city.
 */
function countDistinctPlaces(pins: LibraryPin[]): number {
  const names = new Set<string>();
  for (const pin of pins) {
    const city = pin.city?.trim();
    const name = city || pin.country?.trim();
    if (name) names.add(name.toLowerCase());
  }
  return names.size;
}

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
    cities: countDistinctPlaces(pins),
    countries: countries.size,
    points,
  };
}
