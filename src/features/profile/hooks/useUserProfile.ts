import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Profile } from "@/types/database";

const PROFILE_SELECT =
  "id, username, bio, avatar_url, country, location, role, verified_architect_id" as const;

export type UserProfile = Pick<
  Profile,
  | "id"
  | "username"
  | "bio"
  | "avatar_url"
  | "country"
  | "location"
  | "role"
  | "verified_architect_id"
>;

export function useUserProfile() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null;
      const { data: row, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return row;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return { profile: data ?? null, loading: isLoading, refetch };
}
