import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getClaimedPersonSummaryForProfile } from "@/features/credits/api/people";

/**
 * Resolved person row for the signed-in user when they have claimed a `people` profile.
 * Used for sidebar / menu “My Portfolio” visibility only.
 */
export function useClaimedPersonForNav() {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["claimedPersonNav", user?.id ?? "anon"],
    queryFn: () => getClaimedPersonSummaryForProfile(user!.id),
    enabled: Boolean(user?.id) && !authLoading,
    staleTime: 60_000,
  });
}
