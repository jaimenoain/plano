import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { MutualFacepile } from "@/components/connect/MutualFacepile";

export function PeopleYouMayKnow() {
  const { user } = useAuth();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["people-you-may-know", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_people_you_may_know", {
        p_limit: 3
      });
      if (error) throw error;

      if (!data || data.length === 0 || !user) return data || [];

      // Fetch mutual follows details
      const suggestionIds = data.map(s => s.id);

      // Get my following list first to filter mutuals
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const myFollowingIds = followingData?.map(f => f.following_id) || [];

      if (myFollowingIds.length === 0) {
        return data.map(s => ({ ...s, mutual_follows: [] }));
      }

      const { data: mutualsData } = await supabase
        .from('follows')
        .select(`
          following_id,
          follower:profiles!follows_follower_id_fkey(id, username, avatar_url)
        `)
        .in('following_id', suggestionIds)
        .in('follower_id', myFollowingIds);

      return data.map(s => {
        const mutuals = mutualsData
          ?.filter(m => m.following_id === s.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((m: any) => m.follower)
          .filter(Boolean) as {
            id: string;
            username: string | null;
            avatar_url: string | null;
          }[] || [];

        return { ...s, mutual_follows: mutuals };
      });
    },
    enabled: !!user,
  });

  if (isLoading || !suggestions || suggestions.length === 0) return null;

  return (
    <div className="p-5 border rounded-xl bg-card shadow-sm space-y-4">
      <h3 className="font-semibold">People you may know</h3>
      <div className="space-y-4">
        {suggestions.map((person) => (
          <div key={person.id} className="flex items-center justify-between gap-3">
            <Link to={`/profile/${person.username || person.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Avatar className="h-10 w-10">
                <AvatarImage src={person.avatar_url || undefined} />
                <AvatarFallback>{person.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{person.username}</span>
                <div className="flex flex-col text-xs text-muted-foreground mt-1 gap-0.5">
                  {person.mutual_follows && person.mutual_follows.length > 0 ? (
                    <MutualFacepile users={person.mutual_follows} />
                  ) : (
                    <>
                      {person.mutual_count > 0 && (
                        <span>
                          {person.mutual_count} mutual connection{person.mutual_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </>
                  )}
                  {person.group_mutual_count > 0 && (
                    <span>
                      {person.group_mutual_count} group{person.group_mutual_count !== 1 ? 's' : ''} in common
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <FollowButton userId={person.id} isFollower={person.is_follows_me} />
          </div>
        ))}
      </div>
    </div>
  );
}
