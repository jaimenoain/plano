import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MessageSquare } from "lucide-react";

interface FilmFriendsActivityProps {
  tmdbId: number;
  groupId: string;
}

export function FilmFriendsActivity({ tmdbId, groupId }: FilmFriendsActivityProps) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['film-friends-activity', tmdbId, groupId],
    queryFn: async () => {
      // 1. Get film_id
      const { data: film } = await supabase
        .from('films')
        .select('id')
        .eq('tmdb_id', tmdbId)
        .maybeSingle();

      if (!film) return [];

      // 2. Get group members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('status', 'active'); // Only active members

      if (!members || members.length === 0) return [];
      const memberIds = members.map(m => m.user_id);

      // 3. Get log entries (ratings/reviews)
      const { data: logs } = await supabase
        .from('log')
        .select(`
          id,
          rating,
          review,
          status,
          created_at,
          user:profiles(id, username, avatar_url)
        `)
        .eq('film_id', film.id)
        .in('user_id', memberIds)
        .not('status', 'eq', 'watchlist') // We mainly want reviews/ratings, not just "want to watch" which is implied by the voting session
        .order('created_at', { ascending: false });

      return logs || [];
    },
    enabled: !!tmdbId && !!groupId
  });

  if (isLoading) return <div className="h-20 animate-pulse bg-white/5 rounded-xl" />;
  if (!activity || activity.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-lg font-semibold text-white/90 border-t border-white/10 pt-6">Friends Activity</h3>
      <div className="space-y-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {activity.map((item: any) => (
          <div key={item.id} className="bg-white/5 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border border-white/10">
                  <AvatarImage src={item.user?.avatar_url} />
                  <AvatarFallback>{item.user?.username?.[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm text-white/90">{item.user?.username}</span>
              </div>
              <div className="flex items-center gap-1">
                 {item.rating > 0 && (
                     <div className="flex items-center text-yellow-500">
                         <Star className="h-3 w-3 fill-current" />
                         <span className="ml-1 text-sm font-bold">{item.rating}</span>
                     </div>
                 )}
              </div>
            </div>
            {item.review && (
                <div className="pl-10">
                    <p className="text-sm text-white/70 italic line-clamp-3">"{item.review}"</p>
                </div>
            )}
             {!item.review && item.status === 'watched' && (
                 <div className="pl-10 text-xs text-white/50">Watched</div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}
