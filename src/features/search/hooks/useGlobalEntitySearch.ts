import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { searchPeople, discoverPeople } from "@/features/credits/api/people";
import { searchCompanies, discoverCompanies } from "@/features/credits/api/companies";
import type { CompanySummary, PersonSummary } from "@/features/credits/types";
import type { Bounds } from "@/utils/map";

export type { CompanySummary, PersonSummary };

interface UseGlobalEntitySearchProps {
  searchQuery: string;
  bounds?: Bounds | null;
  enabled?: boolean;
  minLength?: number;
}

export function useGlobalEntitySearch({
  searchQuery,
  bounds,
  enabled = true,
  minLength = 2,
}: UseGlobalEntitySearchProps) {
  const debouncedQuery = useDebounce(searchQuery, 300);
  const q = debouncedQuery.trim();
  const hasQuery = enabled && q.length >= minLength;
  const runDiscover = enabled && !hasQuery;

  const peopleSearchQuery = useQuery({
    queryKey: ["global-search-people", q],
    queryFn: () => searchPeople(q),
    enabled: hasQuery,
    staleTime: 60_000,
  });

  const companiesSearchQuery = useQuery({
    queryKey: ["global-search-companies", q],
    queryFn: () => searchCompanies(q),
    enabled: hasQuery,
    staleTime: 60_000,
  });

  const peopleDiscoverQuery = useQuery({
    queryKey: ["discover-people", bounds],
    queryFn: () => discoverPeople(bounds),
    enabled: runDiscover && !!bounds,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const companiesDiscoverQuery = useQuery({
    queryKey: ["discover-companies", bounds],
    queryFn: () => discoverCompanies(bounds),
    enabled: runDiscover && !!bounds,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  // In discover mode, a disabled query (no bounds yet) reports isLoading===false,
  // which would flash the EmptyState before the map reports its viewport. Treat
  // "waiting for bounds" as loading so the tabs show a spinner instead.
  const peopleLoading = hasQuery
    ? peopleSearchQuery.isLoading
    : !bounds || peopleDiscoverQuery.isLoading;
  const companiesLoading = hasQuery
    ? companiesSearchQuery.isLoading
    : !bounds || companiesDiscoverQuery.isLoading;
  const peopleError = hasQuery
    ? peopleSearchQuery.isError
    : peopleDiscoverQuery.isError;
  const companiesError = hasQuery
    ? companiesSearchQuery.isError
    : companiesDiscoverQuery.isError;

  return {
    people: hasQuery
      ? (peopleSearchQuery.data ?? [])
      : (peopleDiscoverQuery.data ?? []),
    companies: hasQuery
      ? (companiesSearchQuery.data ?? [])
      : (companiesDiscoverQuery.data ?? []),
    peopleLoading,
    companiesLoading,
    peopleError,
    companiesError,
    isLoading: peopleLoading || companiesLoading,
    isDiscovery: runDiscover,
  };
}
