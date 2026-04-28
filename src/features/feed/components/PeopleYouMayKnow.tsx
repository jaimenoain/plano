import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { UserRow } from "@/features/connect/components/UserRow";

type MutualFollowRow = {
  following_id: string;
  follower:
    | { id: string; username: string | null; avatar_url: string | null }
    | { id: string; username: string | null; avatar_url: string | null }[]
    | null;
};

type PeopleYouMayKnowSuggestion = {
  id: string;
  username: string | null;
  avatar_url?: string | null;
  mutual_follows?: { id: string; username: string | null; avatar_url: string | null }[];
  mutual_count?: number;
  group_mutual_count?: number;
  is_follows_me?: boolean;
};

const DEFAULT_SUGGESTION_LIMIT = 5;

interface PeopleYouMayKnowProps {
  /** When false, omit the eyebrow label (parent provides one, e.g. feed right rail). Default true for inline feed placements. */
  showHeading?: boolean;
  /** Max suggestions from RPC (rail uses 3; inline placements may pass more). */
  maxSuggestions?: number;
  /** Narrow sidebars should pass `stacked` so names use full width (feed right rail). */
  userRowLayout?: "default" | "stacked";
}

export function PeopleYouMayKnow({
  showHeading = true,
  maxSuggestions = DEFAULT_SUGGESTION_LIMIT,
  userRowLayout = "default",
}: PeopleYouMayKnowProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["people-you-may-know", user?.id, maxSuggestions],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_people_you_may_know", {
        p_limit: maxSuggestions,
      });
      if (error) throw error;

      const rpcRows = (data as unknown as { id: string }[]) ?? [];
      if (!rpcRows.length || !user) return rpcRows;

      const suggestionIds = rpcRows.map((s) => s.id);

      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const myFollowingIds = followingData?.map((f) => f.following_id) || [];

      if (myFollowingIds.length === 0) {
        return rpcRows.map((s) => ({
          ...s,
          mutual_follows: [] as {
            id: string;
            username: string | null;
            avatar_url: string | null;
          }[],
        }));
      }

      const { data: mutualsData } = await supabase
        .from("follows")
        .select(`
          following_id,
          follower:profiles!follows_follower_id_fkey(id, username, avatar_url)
        `)
        .in("following_id", suggestionIds)
        .in("follower_id", myFollowingIds);

      const mutualRows = (mutualsData ?? []) as unknown as MutualFollowRow[];
      return rpcRows.map((s) => {
        const mutuals = mutualRows
          .filter((m) => m.following_id === s.id)
          .map((m) => {
            const f = m.follower;
            return Array.isArray(f) ? f[0] : f;
          })
          .filter((f): f is NonNullable<typeof f> => f != null);

        return { ...s, mutual_follows: mutuals };
      });
    },
    enabled: !!user,
  });

  const hideMutation = useMutation({
    mutationFn: async (suggestedId: string) => {
      if (!user) return;
      const { error } = await supabase.from("suggested_profile_hides").insert({
        user_id: user.id,
        suggested_user_id: suggestedId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-you-may-know"] });
    },
  });

  const headingEl = showHeading ? (
    <p className="text-2xs font-medium tracking-widest uppercase text-text-secondary mb-4">
      People you may know
    </p>
  ) : null;

  if (isLoading) {
    return (
      <div>
        {headingEl}
        <div className="flex flex-col">
          {Array.from({ length: maxSuggestions }).map((_, i) =>
            userRowLayout === "stacked" ? (
              <div key={i} className="flex flex-col gap-2 border-b border-border-default p-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-surface-muted animate-pulse shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2 min-w-0 pt-0.5">
                    <div className="h-3 w-full bg-surface-muted animate-pulse" />
                    <div className="h-2.5 w-20 bg-surface-muted/70 animate-pulse" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <div className="h-8 w-8 bg-surface-muted animate-pulse shrink-0" />
                  <div className="h-8 w-16 bg-surface-muted animate-pulse shrink-0" />
                </div>
              </div>
            ) : (
              <div
                key={i}
                className="flex items-center gap-3 p-4 border-b border-border-default"
              >
                <div className="h-10 w-10 bg-surface-muted animate-pulse shrink-0 rounded-none" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3 w-24 bg-surface-muted animate-pulse" />
                  <div className="h-2.5 w-16 bg-surface-muted/70 animate-pulse" />
                </div>
                <div className="h-8 w-14 bg-surface-muted animate-pulse shrink-0" />
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div>
      {headingEl}
      <div className="flex flex-col">
        {(suggestions as PeopleYouMayKnowSuggestion[]).map((person) => (
          <UserRow
            key={person.id}
            layout={userRowLayout}
            user={{
              id: person.id,
              username: person.username,
              avatar_url: person.avatar_url ?? null,
            }}
            showFollowButton
            isFollower={person.is_follows_me}
            mutualFollows={person.mutual_follows}
            onHide={() => hideMutation.mutate(person.id)}
          />
        ))}
      </div>
    </div>
  );
}
