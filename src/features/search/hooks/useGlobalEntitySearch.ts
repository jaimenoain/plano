import { useQuery } from "@tanstack/react-query";
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
    enabled: runDiscover,
    staleTime: 60_000,
  });

  const companiesDiscoverQuery = useQuery({
    queryKey: ["discover-companies", bounds],
    queryFn: () => discoverCompanies(bounds),
    enabled: runDiscover,
    staleTime: 60_000,
  });

  return {
    people: hasQuery
      ? (peopleSearchQuery.data ?? [])
      : (peopleDiscoverQuery.data ?? []),
    companies: hasQuery
      ? (companiesSearchQuery.data ?? [])
      : (companiesDiscoverQuery.data ?? []),
    isLoading: hasQuery
      ? peopleSearchQuery.isLoading || companiesSearchQuery.isLoading
      : peopleDiscoverQuery.isLoading || companiesDiscoverQuery.isLoading,
    isDiscovery: runDiscover,
  };
}
