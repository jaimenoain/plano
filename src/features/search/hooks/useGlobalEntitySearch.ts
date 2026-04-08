import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { searchPeople } from "@/features/credits/api/people";
import { searchCompanies } from "@/features/credits/api/companies";
import type { CompanySummary, PersonSummary } from "@/features/credits/types";

export type { CompanySummary, PersonSummary };

interface UseGlobalEntitySearchProps {
  searchQuery: string;
  enabled?: boolean;
  minLength?: number;
}

export function useGlobalEntitySearch({
  searchQuery,
  enabled = true,
  minLength = 2,
}: UseGlobalEntitySearchProps) {
  const debouncedQuery = useDebounce(searchQuery, 300);
  const q = debouncedQuery.trim();
  const run = enabled && q.length >= minLength;

  const peopleQuery = useQuery({
    queryKey: ["global-search-people", q],
    queryFn: () => searchPeople(q),
    enabled: run,
    staleTime: 60_000,
  });

  const companiesQuery = useQuery({
    queryKey: ["global-search-companies", q],
    queryFn: () => searchCompanies(q),
    enabled: run,
    staleTime: 60_000,
  });

  return {
    people: peopleQuery.data ?? [],
    companies: companiesQuery.data ?? [],
    isLoading: Boolean(run && (peopleQuery.isLoading || companiesQuery.isLoading)),
  };
}
