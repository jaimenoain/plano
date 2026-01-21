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

  if (!isMember) {
    return <JoinGroupPrompt group={group} />;
  }

  // Fetch Building IDs
  const { data: allGroupBuildingIds = [] } = useQuery({
    queryKey: ["group-all-building-ids", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_buildings")
        .select(`building_id, group_sessions!inner(group_id)`)
        .eq("group_sessions.group_id", id);
      if (error) throw error;
      const ids = data.map(d => d.building_id);
      return Array.from(new Set(ids));
    },
    enabled: !!id,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: entriesLoading
  } = useInfiniteQuery({
    queryKey: ["group-entries", id, showOffSession, allGroupBuildingIds],
    queryFn: async ({ pageParam = 0 }) => {
      if (!group?.members) return [];
      // If we only show session buildings and there are none, return empty immediately
      if (!showOffSession && allGroupBuildingIds.length === 0) return [];

      const memberIds = group.members.map((m: any) => m.user.id);
      
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
        
      if (error) throw error;

      return (data || []).map(entry => ({
        ...entry,
        likes_count: (entry as any).likes?.length || 0,
        comments_count: (entry as any).comments?.[0]?.count || 0,
        is_liked: ((entry as any).user_likes?.length || 0) > 0
      }));
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    enabled: !!id && !!group?.members && (showOffSession || allGroupBuildingIds.length > 0),
    initialPageParam: 0,
  });

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
