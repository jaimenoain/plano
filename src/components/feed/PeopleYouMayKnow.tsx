import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/hooks/useAuth";

export function PeopleYouMayKnow() {
  const { user } = useAuth();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["people-you-may-know", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_people_you_may_know", {
        p_limit: 3
      });
      if (error) throw error;
      return data;
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
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={person.avatar_url || undefined} />
                <AvatarFallback>{person.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{person.username}</span>
                {person.mutual_count > 0 && (
                   <span className="text-xs text-muted-foreground mt-1">
                     {person.mutual_count} mutual connection{person.mutual_count !== 1 ? 's' : ''}
                   </span>
                )}
              </div>
            </div>
            <FollowButton userId={person.id} isFollower={person.is_follows_me} />
          </div>
        ))}
      </div>
    </div>
  );
}
