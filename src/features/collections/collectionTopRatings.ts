/**
 * collectionTopRatings.ts
 *
 * Pure helpers over `get_collection_stats` RPC rows — the same rows feed both
 * the map's pin colouring (`buildStatsMap`) and the list's "top rating" line
 * (`buildTopRatingMap`). Kept out of CollectionMapPage.tsx, which has no
 * remaining size budget.
 */

export interface CollectionStatRow {
  building_id: string;
  user_id: string;
  status: string | null;
  rating: number | null;
}

export interface BuildingStat {
  visitedCount: number;
  maxRating: number;
  hasSaved: boolean;
}

/** Collapses per-member stat rows into one aggregate per building, for pin colouring. */
export function buildStatsMap(rows: CollectionStatRow[] | undefined): Map<string, BuildingStat> {
  const statsMap = new Map<string, BuildingStat>();
  if (!rows) return statsMap;

  rows.forEach((row) => {
    if (!statsMap.has(row.building_id)) {
      statsMap.set(row.building_id, { visitedCount: 0, maxRating: 0, hasSaved: false });
    }
    const stat = statsMap.get(row.building_id)!;
    if (row.status === 'visited') stat.visitedCount++;
    if (row.rating && row.rating > stat.maxRating) stat.maxRating = row.rating;
    stat.hasSaved = true; // Present in user_buildings implies saved/interested
  });

  return statsMap;
}

export interface TopRating {
  userId: string;
  rating: number;
}

/**
 * Per building, the rater with the highest rating (ties broken by the lower
 * user id, for a deterministic result independent of row order). Ratings of
 * null/0 never win — "Interesting" (0) carries no dots and isn't worth
 * naming a rater over.
 */
export function buildTopRatingMap(rows: CollectionStatRow[] | undefined): Map<string, TopRating> {
  const topMap = new Map<string, TopRating>();
  if (!rows) return topMap;

  rows.forEach((row) => {
    if (!row.rating || row.rating <= 0) return;
    const current = topMap.get(row.building_id);
    if (
      !current ||
      row.rating > current.rating ||
      (row.rating === current.rating && row.user_id < current.userId)
    ) {
      topMap.set(row.building_id, { userId: row.user_id, rating: row.rating });
    }
  });

  return topMap;
}
