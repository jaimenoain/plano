import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Link } from "react-router";
import { MutualFacepile } from "@/features/connect/components/MutualFacepile";
import { X } from "lucide-react";

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

export function PeopleYouMayKnow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["people-you-may-know", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_people_you_may_know", {
        p_limit: 5
      });
      if (error) throw error;

      const rpcRows = (data as unknown as { id: string }[]) ?? [];
      if (!rpcRows.length || !user) return rpcRows;

      // Fetch mutual follows details
      const suggestionIds = rpcRows.map((s) => s.id);

      // Get my following list first to filter mutuals
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const myFollowingIds = followingData?.map(f => f.following_id) || [];

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
        .from('follows')
        .select(`
          following_id,
          follower:profiles!follows_follower_id_fkey(id, username, avatar_url)
        `)
        .in('following_id', suggestionIds)
        .in('follower_id', myFollowingIds);

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
        const { error } = await supabase
            .from("suggested_profile_hides")
            .insert({
                user_id: user.id,
                suggested_user_id: suggestedId
            });
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["people-you-may-know"] });
    }
  });

  if (isLoading || !suggestions || suggestions.length === 0) return null;

  return (
    <div className="mb-12 max-w-full w-full overflow-hidden">
      <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary mb-4">
        People you may know
      </h3>
      <div className="flex overflow-x-auto gap-6 pb-2 snap-x hide-scrollbar">
        {suggestions.map((person: PeopleYouMayKnowSuggestion) => (
          <div key={person.id} className="relative flex flex-col items-center gap-3 min-w-[140px] max-w-[140px] snap-center shrink-0 group">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    hideMutation.mutate(person.id);
                }}
                className="absolute -top-1 -right-1 p-1 text-text-disabled hover:text-text-primary transition-colors z-10"
                title="Hide suggestion"
            >
                <X className="h-3.5 w-3.5" />
            </button>

            <Link to={`/profile/${person.username || person.id}`} className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity w-full text-center">
              <Avatar className="h-12 w-12">
                <AvatarImage src={person.avatar_url || undefined} />
                <AvatarFallback>{person.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center w-full min-w-0 gap-0.5">
                <span className="text-sm font-medium leading-tight truncate w-full">{person.username}</span>
                <div className="flex flex-col items-center text-xs text-text-secondary w-full">
                  {person.mutual_follows && person.mutual_follows.length > 0 ? (
                    <div className="scale-90 origin-top w-full flex justify-center">
                        <MutualFacepile users={person.mutual_follows} className="justify-center w-full" />
                    </div>
                  ) : (person.mutual_count ?? 0) > 0 ? (
                    <span className="text-xs text-text-disabled truncate">
                      {person.mutual_count} mutual
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
            <FollowButton
              userId={person.id}
              isFollower={person.is_follows_me}
              className="w-full text-xs h-7 rounded-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
