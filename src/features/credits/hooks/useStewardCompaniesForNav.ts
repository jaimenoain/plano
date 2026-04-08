import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getMyStewardCompaniesForNav } from "@/features/credits/api/companies";

/**
 * Companies the signed-in user stewards — drives sidebar / menu links to the company dashboard.
 */
export function useStewardCompaniesForNav() {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["stewardCompaniesNav", user?.id ?? "anon"],
    queryFn: () => getMyStewardCompaniesForNav(),
    enabled: Boolean(user?.id) && !authLoading,
    staleTime: 60_000,
  });
}
