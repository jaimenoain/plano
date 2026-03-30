import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { MutualFacepile } from "@/components/connect/MutualFacepile";
import { X } from "lucide-react";

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

  const hideMutation = useMutation({
    mutationFn: async (suggestedId: string) => {
        if (!user) return;
        const { error } = await supabase
            .from("suggested_profile_hides" as any)
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
    <div className="p-5 border rounded-xl bg-card shadow-sm space-y-4 max-w-full w-full overflow-hidden">
      <h3 className="font-semibold">People you may know</h3>
      <div className="flex overflow-x-auto gap-4 pb-4 px-1 snap-x hide-scrollbar">
        {suggestions.map((person) => (
          <div key={person.id} className="relative flex flex-col items-center justify-between gap-3 min-w-[200px] max-w-[200px] snap-center p-4 border rounded-lg bg-background/50 shrink-0 h-full group">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    hideMutation.mutate(person.id);
                }}
                className="absolute top-1 right-1 p-1 text-muted-foreground/30 hover:text-foreground hover:bg-muted rounded-full transition-colors z-10"
                title="Hide suggestion"
            >
                <X className="h-4 w-4" />
            </button>

            <Link to={`/profile/${person.username || person.id}`} className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity w-full text-center">
              <Avatar className="h-14 w-14 mb-1 border-2 border-background shadow-sm">
                <AvatarImage src={person.avatar_url || undefined} />
                <AvatarFallback>{person.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center w-full min-w-0 gap-1">
                <span className="text-sm font-semibold leading-none truncate w-full">{person.username}</span>
                <div className="flex flex-col items-center text-xs text-muted-foreground w-full gap-0.5">
                  {person.mutual_follows && person.mutual_follows.length > 0 ? (
                    <div className="scale-90 origin-top w-full flex justify-center">
                        <MutualFacepile users={person.mutual_follows} className="justify-center w-full" />
                    </div>
                  ) : (
                    <div className="h-5 flex items-center justify-center w-full">
                      {person.mutual_count > 0 && (
                        <span className="truncate">
                          {person.mutual_count} mutual
                        </span>
                      )}
                    </div>
                  )}
                  {person.group_mutual_count > 0 && (
                     <span className="truncate w-full text-[10px] text-muted-foreground/80">
                      {person.group_mutual_count} group{person.group_mutual_count !== 1 ? 's' : ''} common
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <FollowButton userId={person.id} isFollower={person.is_follows_me} className="w-full mt-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
