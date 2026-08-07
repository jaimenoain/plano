/**
 * useCollectionTopRatings.ts
 *
 * Resolves the winning rater's username for every building in a collection's
 * `get_collection_stats` rows, for the "show the building's top rating" list
 * toggle (Task 5.5). One profiles query for the small set of raters who
 * actually top a building — not every member.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProfileUsernames } from "../api/collaboration";
import { buildTopRatingMap, type CollectionStatRow } from "../collectionTopRatings";

export interface CollectionTopRating {
  username: string;
  rating: number;
}

export function useCollectionTopRatings(
  statsRows: CollectionStatRow[] | undefined,
  enabled: boolean,
): Map<string, CollectionTopRating> {
  const topRatingMap = useMemo(() => buildTopRatingMap(statsRows), [statsRows]);

  const userIds = useMemo(
    () => Array.from(new Set(Array.from(topRatingMap.values(), (t) => t.userId))).sort(),
    [topRatingMap],
  );

  const { data: profiles } = useQuery({
    queryKey: ["collection_top_rating_profiles", userIds],
    queryFn: () => fetchProfileUsernames(userIds),
    enabled: enabled && userIds.length > 0,
  });

  return useMemo(() => {
    const result = new Map<string, CollectionTopRating>();
    if (!profiles) return result;
    const usernameById = new Map(profiles.map((p) => [p.id, p.username]));
    topRatingMap.forEach((top, buildingId) => {
      const username = usernameById.get(top.userId);
      if (username) result.set(buildingId, { username, rating: top.rating });
    });
    return result;
  }, [profiles, topRatingMap]);
}
