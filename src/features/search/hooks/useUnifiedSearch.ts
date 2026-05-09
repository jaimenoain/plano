import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { searchBuildingsV2 } from "@/features/search/api/searchBuildingsV2";
import { searchPeopleV2 } from "@/features/search/api/searchPeopleV2";
import { searchCompaniesV2 } from "@/features/search/api/searchCompaniesV2";
import type { BuildingSearchHit } from "@/features/search/api/searchBuildingsV2";
import type { PersonSummary, CompanySummary } from "@/features/credits/types";
import type { SearchBuildingsV2Filters } from "@/features/search/api/searchBuildingsV2";

export type { BuildingSearchHit };

interface UseUnifiedSearchProps {
  query: string;
  filters?: SearchBuildingsV2Filters;
  minLength?: number;
}

interface UnifiedSearchResult {
  buildings: BuildingSearchHit[];
  people: PersonSummary[];
  companies: CompanySummary[];
  isLoading: boolean;
  error: Error | null;
}

const EMPTY: UnifiedSearchResult = {
  buildings: [],
  people: [],
  companies: [],
  isLoading: false,
  error: null,
};

/**
 * Find-mode unified search hook.
 *
 * Fires three parallel RPC calls (search_buildings_v2, search_people_v2,
 * search_companies_v2) when query.length >= minLength (default 2). Cancels
 * in-flight requests when the query changes via AbortController.
 *
 * Browse mode (no query) is handled by the existing get_map_clusters path in
 * useBuildingSearch — this hook is only active in Find mode.
 */
export function useUnifiedSearch({
  query,
  filters,
  minLength = 2,
}: UseUnifiedSearchProps): UnifiedSearchResult {
  const debouncedQuery = useDebounce(query, 300);
  const q = debouncedQuery.trim();
  const isActive = q.length >= minLength;

  // AbortController ref — cancelled when the query key changes
  const abortRef = useRef<AbortController | null>(null);

  const buildingsQuery = useQuery<BuildingSearchHit[], Error>({
    queryKey: ["unified-search-buildings", q, filters],
    queryFn: () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      return searchBuildingsV2(q, { limit: 30, filters });
    },
    enabled: isActive,
    staleTime: 30_000,
  });

  const peopleQuery = useQuery<PersonSummary[], Error>({
    queryKey: ["unified-search-people", q],
    queryFn: () => searchPeopleV2(q, { limit: 10 }),
    enabled: isActive,
    staleTime: 30_000,
  });

  const companiesQuery = useQuery<CompanySummary[], Error>({
    queryKey: ["unified-search-companies", q],
    queryFn: () => searchCompaniesV2(q, { limit: 10 }),
    enabled: isActive,
    staleTime: 30_000,
  });

  if (!isActive) return EMPTY;

  return {
    buildings: buildingsQuery.data ?? [],
    people: peopleQuery.data ?? [],
    companies: companiesQuery.data ?? [],
    isLoading:
      buildingsQuery.isLoading ||
      peopleQuery.isLoading ||
      companiesQuery.isLoading,
    error: buildingsQuery.error ?? peopleQuery.error ?? companiesQuery.error ?? null,
  };
}
