/**
 * useCollectionSearchSuggestions.ts
 *
 * "Nothing in this collection matched — here is what Plano *does* have."
 *
 * The in-collection search is a pure client-side narrowing of items already in
 * memory (see `useCollectionSearch`). When it comes back empty for someone who
 * can edit the collection, this hook takes the same query out to the database so
 * the dead end becomes an offer: add one of these, or create the building.
 *
 * Search goes through `search_buildings_v2` — the authoritative ranked text
 * search. It covers a building's name, alt name, aliases, address, place and its
 * credited architects and firms, so the query that matched an item inside the
 * collection by its architect finds buildings out here too (migration
 * 20271192000000). Credit matches score ~0.42 against the floor below.
 *
 * Buildings already in the collection (including ones hidden from suggestions)
 * are dropped, so every row on screen is genuinely addable.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  discoveryBuildingFromSearchHit,
  searchBuildingsV2,
  type DiscoveryBuilding,
} from "@/features/search";
import { addBuildingToCollection } from "../api/collectionItems";

/** Below two characters the ranked search is noise, so it never fires. */
export const MIN_SUGGESTION_QUERY_LENGTH = 2;
/** A suggestion list is an aside in a narrow rail — a handful, not a SERP. */
export const MAX_SUGGESTIONS = 6;
/** Fetched wider than shown: collection members are filtered out client-side. */
const FETCH_LIMIT = 12;
/**
 * The RPC also returns loose trigram neighbours, which read as nonsense when
 * they are offered as "matches" — "zaha" otherwise suggests *Hanaha* and
 * *Zazzle*. Measured against production, a full-text hit scores from ~0.24
 * (`Casa da Música` for "casa da musica") while pure trigram noise tops out
 * around 0.19, so 0.2 separates the two. Better to offer nothing, and the
 * create-a-building way out, than a wrong building.
 */
const MIN_RANK_SCORE = 0.2;

interface UseCollectionSearchSuggestionsArgs {
  collectionId: string;
  /** The settled (already debounced) query from the collection search box. */
  query: string;
  /** False for viewers who may not edit, or when the collection had matches. */
  enabled: boolean;
  /** Every building already in the collection, hidden ones included. */
  excludeBuildingIds: Set<string>;
}

export interface CollectionSearchSuggestions {
  buildings: DiscoveryBuilding[];
  isLoading: boolean;
  /** True once a settled search has returned with nothing to offer. */
  isEmpty: boolean;
  addBuilding: (building: DiscoveryBuilding) => void;
  /** The building currently being added, so only its own button spins. */
  addingId: string | null;
}

export function useCollectionSearchSuggestions({
  collectionId,
  query,
  enabled,
  excludeBuildingIds,
}: UseCollectionSearchSuggestionsArgs): CollectionSearchSuggestions {
  const queryClient = useQueryClient();
  const [addingId, setAddingId] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const isActive = enabled && trimmedQuery.length >= MIN_SUGGESTION_QUERY_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: ["collection-search-suggestions", trimmedQuery],
    queryFn: () => searchBuildingsV2(trimmedQuery, { limit: FETCH_LIMIT }),
    enabled: isActive,
    staleTime: 30_000,
  });

  const buildings = useMemo(() => {
    if (!data) return [];
    return data
      .filter((hit) => hit.rank_score >= MIN_RANK_SCORE && !excludeBuildingIds.has(hit.id))
      .slice(0, MAX_SUGGESTIONS)
      .map(discoveryBuildingFromSearchHit);
  }, [data, excludeBuildingIds]);

  const addMutation = useMutation({
    mutationFn: (building: DiscoveryBuilding) => {
      setAddingId(building.id);
      return addBuildingToCollection(collectionId, building.id);
    },
    onSuccess: (_result, building) => {
      toast.success(`${building.name} added to collection`);
      // The page's items query — refreshing it redraws the rail list, the map
      // pins and the "n of m entries" count in one go.
      void queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
    },
    onError: () => {
      toast.error("Could not add that building to the collection.");
    },
    onSettled: () => setAddingId(null),
  });

  return {
    buildings,
    isLoading: isActive && isFetching,
    isEmpty: isActive && !isFetching && buildings.length === 0,
    addBuilding: addMutation.mutate,
    addingId,
  };
}
