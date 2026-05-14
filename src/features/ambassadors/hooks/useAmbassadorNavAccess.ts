import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the current user has ambassador portal access.
 * Used for conditional nav visibility only — not a security gate.
 * Security enforcement is handled by AmbassadorGuard on the route.
 */
export function useAmbassadorNavAccess() {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["ambassadorNavAccess", user?.id ?? "anon"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_embassy_portal_access");
      if (error) return false;
      return data === true;
    },
    enabled: Boolean(user?.id) && !authLoading,
    staleTime: 60_000,
  });
}
