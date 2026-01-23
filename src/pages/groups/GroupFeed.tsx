import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReviewCard } from "@/components/feed/ReviewCard";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { JoinGroupPrompt } from "@/components/groups/JoinGroupPrompt";

const PAGE_SIZE = 60;

export default function GroupFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { group, isMember } = useOutletContext<{ group: any; isMember: boolean }>();
  
  // Use the ID from the group context passed by GroupLayout.
  // The URL parameter is likely 'slug', so useParams().id would be undefined.
  const id = group?.id;
  const [showOffSession, setShowOffSession] = useState(false);

  // Fetch Building IDs
  const { data: allGroupBuildingIds = [] } = useQuery({
    queryKey: ["group-all-building-ids", id],
    enabled: !!id && isMember,
    queryFn: async () => {
      // Try fetching from session_buildings (new schema)
      const { data: buildingsData, error: buildingsError } = await supabase
        .from("session_buildings")
        .select(`building_id, group_sessions!inner(group_id)`)
        .eq("group_sessions.group_id", id);

      if (!buildingsError && buildingsData) {
        const ids = buildingsData.map(d => d.building_id);
        return Array.from(new Set(ids));
      }

      // Fallback to session_films (legacy schema)
      const { data: filmsData, error: filmsError } = await supabase
        .from("session_films" as any)
        .select(`film_id, group_sessions!inner(group_id)`)
        .eq("group_sessions.group_id", id);

      if (filmsError) {
        console.error("Failed to fetch session buildings/films", buildingsError, filmsError);
        throw buildingsError || filmsError;
      }

      const ids = filmsData.map((d: any) => d.film_id);
      return Array.from(new Set(ids));
    },
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: entriesLoading
  } = useInfiniteQuery({
    queryKey: ["group-entries", id, showOffSession, allGroupBuildingIds],
    enabled: !!id && !!group?.members && isMember && (showOffSession || allGroupBuildingIds.length > 0),
    queryFn: async ({ pageParam = 0 }) => {
      if (!group?.members) return [];
      // If we only show session buildings and there are none, return empty immediately
      if (!showOffSession && allGroupBuildingIds.length === 0) return [];

      const memberIds = group.members.map((m: any) => m.user.id);
      
      // Try fetching from user_buildings (new schema)
      let query = supabase
        .from("user_buildings")
        .select(`
          id, content, rating, created_at, edited_at, visited_at, tags, status,
          user:profiles(id, username, avatar_url),
          building:buildings(id, name, main_image_url, address),
          likes:likes(id),
          comments:comments(count),
          user_likes:likes(id)
        `)
        .in("user_id", memberIds)
        .in("status", ["visited", "pending", "review"])
        .eq("user_likes.user_id", user?.id || '')
        .order("edited_at", { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (!showOffSession) {
        query = query.in("building_id", allGroupBuildingIds);
      } else if (allGroupBuildingIds.length > 0) {
        query = query.not("building_id", "in", `(${allGroupBuildingIds.join(',')})`);
      }

      const { data, error } = await query;

      if (!error) {
        return (data || []).map(entry => ({
          ...entry,
          likes_count: (entry as any).likes?.length || 0,
          comments_count: (entry as any).comments?.[0]?.count || 0,
          is_liked: ((entry as any).user_likes?.length || 0) > 0
        }));
      }

      // Fallback to log (legacy schema)
      let legacyQuery = supabase
        .from("log" as any)
        .select(`
          id, content, rating, created_at, edited_at, watched_at, tags, status,
          user:profiles(id, username, avatar_url),
          film:films(id, title, poster_path, release_date),
          likes:likes(id),
          comments:comments(count),
          user_likes:likes(id)
        `)
        .in("user_id", memberIds)
        .in("status", ["watched", "watchlist", "review"]) // Legacy statuses
        .eq("user_likes.user_id", user?.id || '')
        .order("edited_at", { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

       if (!showOffSession) {
        legacyQuery = legacyQuery.in("film_id", allGroupBuildingIds);
      } else if (allGroupBuildingIds.length > 0) {
        legacyQuery = legacyQuery.not("film_id", "in", `(${allGroupBuildingIds.join(',')})`);
      }

      const { data: legacyData, error: legacyError } = await legacyQuery;

      if (legacyError) {
         console.error("Failed to fetch user buildings/log", error, legacyError);
         throw error || legacyError;
      }

      // Map legacy data to new shape
      return (legacyData || []).map((entry: any) => ({
        id: entry.id,
        content: entry.content,
        rating: entry.rating,
        created_at: entry.created_at,
        edited_at: entry.edited_at,
        visited_at: entry.watched_at, // mapped
        tags: entry.tags,
        status: entry.status === 'watchlist' ? 'pending' : (entry.status === 'watched' ? 'visited' : entry.status), // mapped
        user: entry.user,
        building: {
          id: entry.film?.id,
          name: entry.film?.title, // mapped
          main_image_url: entry.film?.poster_path ? `https://image.tmdb.org/t/p/w500${entry.film.poster_path}` : null, // mapped
          address: null, // No address in legacy
          year_completed: entry.film?.release_date ? parseInt(entry.film.release_date.substring(0, 4)) : null, // mapped
        },
        likes_count: entry.likes?.length || 0,
        comments_count: entry.comments?.[0]?.count || 0,
        is_liked: (entry.user_likes?.length || 0) > 0
      }));
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  if (!isMember) {
    return <JoinGroupPrompt group={group} />;
  }

  const handleLike = async (reviewId: string) => {
    if (!user) return;

    // Optimistic update
    queryClient.setQueryData(
      ["group-entries", id, showOffSession, allGroupBuildingIds],
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any[]) =>
            page.map((r: any) => {
              if (r.id === reviewId) {
                return {
                  ...r,
                  is_liked: !r.is_liked,
                  likes_count: r.is_liked ? r.likes_count - 1 : r.likes_count + 1,
                };
              }
              return r;
            })
          ),
        };
      }
    );

    // Get the flattened list to check current state (which is the PREVIOUS state because we just updated optimistic cache?
    // No, setQueryData updates the cache immediately.
    // But we need to send the correct request to server.
    // We can assume if we just toggled it, the server state was the opposite.

    // Let's find the item in the cache we just updated
    const cache = queryClient.getQueryData(["group-entries", id, showOffSession, allGroupBuildingIds]) as any;
    let isLikedNow = false;

    // Find the review in the updated cache
    if (cache?.pages) {
      for (const page of cache.pages) {
        const found = page.find((r: any) => r.id === reviewId);
        if (found) {
          isLikedNow = found.is_liked;
          break;
        }
      }
    }

    try {
      if (!isLikedNow) {
        // If it is NOT liked now (in UI), it means we just UNLIKED it. So we delete.
        await supabase.from("likes").delete().eq("interaction_id", reviewId).eq("user_id", user.id);
      } else {
        // If it IS liked now (in UI), it means we just LIKED it. So we insert.
        await supabase.from("likes").insert({ interaction_id: reviewId, user_id: user.id });
      }
    } catch (error) {
      // Revert if error
      queryClient.invalidateQueries({ queryKey: ["group-entries", id, showOffSession, allGroupBuildingIds] });
    }
  };

  const entries = data?.pages.flat() || [];

  return (
    <div>
      <div className="flex items-center space-x-2 mb-6">
        <Switch
          id="show-off-session"
          checked={showOffSession}
          onCheckedChange={setShowOffSession}
        />
        <Label htmlFor="show-off-session">Off-session ratings</Label>
      </div>

      {entriesLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : entries.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {entries.map((entry: any) => (
              <ReviewCard key={entry.id} entry={entry} onLike={handleLike} />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     Loading...
                   </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground text-sm">
          {showOffSession ? "No activity found." : "No activity for group buildings yet."}
        </div>
      )}
    </div>
  );
}
