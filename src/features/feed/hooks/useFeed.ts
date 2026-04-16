import type { SupabaseClient } from "@supabase/supabase-js";
import { useInfiniteQuery, useQuery, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  creditedEntitiesFromRpcJson,
  type FeedEventAttendance,
  type FeedReview,
  type RawFeedRow,
  type ReviewUser,
} from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

const INITIAL_PAGE_SIZE = 10;
const SUBSEQUENT_PAGE_SIZE = 36;

/** `event_attendances` may be absent from generated `Database` until `gen-types` is run. */
const attendanceClient = supabase as unknown as SupabaseClient;

interface UseFeedOptions {
  showGroupActivity: boolean;
}

type EventJoinRow = {
  id: string;
  title: string;
  slug: string;
  start_at: string;
  end_at: string | null;
  address: string | null;
  cover_image_url: string | null;
  claim_status: string;
  is_deleted: boolean;
};

type RawAttendanceJoinRow = {
  user_id: string;
  created_at: string;
  events: EventJoinRow | EventJoinRow[] | null;
};

function unwrapEvent(ev: EventJoinRow | EventJoinRow[] | null): EventJoinRow | null {
  if (!ev) return null;
  if (Array.isArray(ev)) return ev[0] ?? null;
  return ev;
}

function profileToReviewUser(p: {
  username: string | null;
  avatar_url: string | null;
  followers_count: number | null;
}): ReviewUser {
  return {
    username: p.username,
    avatar_url: p.avatar_url,
    is_verified_architect: false,
    is_architect_of_building: false,
    followers_count: typeof p.followers_count === "number" ? p.followers_count : null,
  };
}

async function loadFeedEventAttendance(viewerId: string): Promise<FeedEventAttendance[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: followsRows, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId);

  if (followsError) return [];

  const followedUserIds = (followsRows ?? []).map((r) => r.following_id);
  if (followedUserIds.length === 0) return [];

  const { data: rawRows, error: rawError } = await attendanceClient
    .from("event_attendances")
    .select(
      `
      user_id,
      created_at,
      events!inner (
        id,
        title,
        slug,
        start_at,
        end_at,
        address,
        cover_image_url,
        claim_status,
        is_deleted
      )
    `,
    )
    .in("user_id", followedUserIds)
    .eq("status", "going")
    .eq("events.is_deleted", false)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(50);

  if (rawError) return [];

  const rows = (rawRows ?? []) as RawAttendanceJoinRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  if (userIds.length === 0) return [];

  const { data: profRows, error: profError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  if (profError) return [];

  const profileMap = new Map(
    (profRows ?? []).map((p) => [
      p.id,
      {
        username: p.username,
        avatar_url: p.avatar_url,
        followers_count: null as number | null,
      },
    ]),
  );

  type Enriched = {
    userId: string;
    createdAt: string;
    event: EventJoinRow;
    actor: ReviewUser;
  };

  const enriched: Enriched[] = [];
  for (const r of rows) {
    const ev = unwrapEvent(r.events);
    if (!ev || ev.is_deleted) continue;
    const prof = profileMap.get(r.user_id);
    if (!prof) continue;
    enriched.push({
      userId: r.user_id,
      createdAt: r.created_at,
      event: ev,
      actor: profileToReviewUser(prof),
    });
  }

  const byEventId = new Map<string, Enriched[]>();
  for (const e of enriched) {
    const list = byEventId.get(e.event.id) ?? [];
    list.push(e);
    byEventId.set(e.event.id, list);
  }

  const out: FeedEventAttendance[] = [];
  for (const [, group] of byEventId) {
    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const actorUserIds = [...new Set(group.map((g) => g.userId))];
    if (actorUserIds.length > 0 && actorUserIds.every((id) => id === viewerId)) continue;

    const actorsOrdered: ReviewUser[] = [];
    const seen = new Set<string>();
    for (const g of group) {
      if (seen.has(g.userId)) continue;
      seen.add(g.userId);
      actorsOrdered.push(g.actor);
    }

    const earliest = group.reduce((min, g) => (g.createdAt < min ? g.createdAt : min), group[0].createdAt);
    const ev = group[0].event;
    out.push({
      id: `attendance-${ev.id}`,
      rowType: "event_attendance",
      eventId: ev.id,
      title: ev.title,
      slug: ev.slug,
      startAt: ev.start_at,
      endAt: ev.end_at,
      address: ev.address,
      coverImageUrl: ev.cover_image_url,
      claimStatus: ev.claim_status,
      actors: actorsOrdered,
      createdAt: earliest,
    });
  }

  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}

export function useFeed({ showGroupActivity }: UseFeedOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["feed", user?.id, showGroupActivity];
  const eventAttendanceQueryKey = ["feed-event-attendance", user?.id] as const;

  const eventAttendanceQuery = useQuery({
    queryKey: eventAttendanceQueryKey,
    queryFn: async () => {
      if (!user) return [];
      return loadFeedEventAttendance(user.id);
    },
    enabled: !!user,
    staleTime: 0,
  });

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const isFirstPage = pageParam === 0;
      const limit = isFirstPage ? INITIAL_PAGE_SIZE : SUBSEQUENT_PAGE_SIZE;
      const from = isFirstPage ? 0 : INITIAL_PAGE_SIZE + (pageParam - 1) * SUBSEQUENT_PAGE_SIZE;

      const { data, error } = await supabase
        .rpc("get_feed", {
          p_limit: limit,
          p_offset: from
        });

      if (error) throw error;

      // RPC return shape not in generated `Database.Functions`
      const feedData = (data || []) as unknown as RawFeedRow[];

      return feedData.filter((r) => r.status !== "ignored").map((review) => ({
        id: review.id,
        content: review.content,
        rating: review.rating,
        tags: review.tags,
        created_at: review.created_at,
        edited_at: review.edited_at,
        status: review.status,
        user_id: review.user_id,
        user: {
          username: review.user_data?.username || null,
          avatar_url: review.user_data?.avatar_url || null,
          is_verified_architect: review.user_data?.is_verified_architect || false,
          is_architect_of_building: review.user_data?.is_architect_of_building || false,
          followers_count:
            typeof review.user_data?.followers_count === "number"
              ? review.user_data.followers_count
              : null,
        },
        building: {
          id: review.building_data?.id,
          short_id: review.building_data?.short_id,
          slug: review.building_data?.slug,
          name: review.building_data?.name || "Unknown Building",
          address: review.building_data?.address || null,
          city: review.building_data?.city || null,
          country: review.building_data?.country || null,
          main_image_url: review.building_data?.main_image_url || null,
          community_preview_url:
            review.building_data?.community_preview_url ?? null,
          creditedEntities: creditedEntitiesFromRpcJson(
            review.building_data?.credited_entities,
          ),
          year_completed: review.building_data?.year_completed || null,
          locality_country_code: review.building_data?.locality_country_code ?? null,
          locality_city_slug: review.building_data?.locality_city_slug ?? null,
        },
        likes_count: review.likes_count || 0,
        comments_count: review.comments_count || 0,
        is_liked: review.is_liked,
        images: (review.review_images || []).map((img) => {
            return {
                id: img.id,
                url: getBuildingImageUrl(img.storage_path),
                likes_count: img.likes_count || 0,
                is_liked: img.is_liked
            };
        }),
        is_suggested: review.is_suggested,
        suggestion_reason: review.suggestion_reason,
      })) as FeedReview[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const isFirstPage = allPages.length === 1;
      const expectedSize = isFirstPage ? INITIAL_PAGE_SIZE : SUBSEQUENT_PAGE_SIZE;
      return lastPage.length === expectedSize ? allPages.length : undefined;
    },
    enabled: !!user,
  });

  const toggleLike = async (reviewId: string) => {
    if (!user) return;

    const currentData = queryClient.getQueryData<InfiniteData<FeedReview[]>>(queryKey);
    if (!currentData) return;

    const review = currentData.pages.flatMap(p => p).find(r => r.id === reviewId);
    if (!review) return;

    // Optimistic Update
    queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (oldData) => {
      if (!oldData) return undefined;
      return {
        ...oldData,
        pages: oldData.pages.map((page) =>
          page.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  is_liked: !r.is_liked,
                  likes_count: r.is_liked ? r.likes_count - 1 : r.likes_count + 1,
                }
              : r
          )
        ),
      };
    });

    try {
      if (review.is_liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("interaction_id", reviewId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("likes")
          .insert({ interaction_id: reviewId, user_id: user.id });
      }
    } catch {
      // Revert
      queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (oldData) => {
          if (!oldData) return undefined;
          return {
              ...oldData,
              pages: oldData.pages.map((page) =>
                  page.map((r) =>
                      r.id === reviewId ? { ...r, is_liked: review.is_liked, likes_count: review.likes_count } : r
                  )
              )
          }
      });
    }
  };

  const toggleImageLike = async (reviewId: string, imageId: string) => {
    if (!user) return;

    const currentData = queryClient.getQueryData<InfiniteData<FeedReview[]>>(queryKey);
    if (!currentData) return;

    const review = currentData.pages.flatMap(p => p).find(r => r.id === reviewId);
    if (!review) return;

    const image = review.images?.find(i => i.id === imageId);
    if (!image) return;

    // Optimistic Update
    queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (oldData) => {
      if (!oldData) return undefined;
      return {
        ...oldData,
        pages: oldData.pages.map((page) =>
          page.map((r) => {
            if (r.id === reviewId) {
                return {
                    ...r,
                    images: r.images?.map(img => {
                        if (img.id === imageId) {
                            return {
                                ...img,
                                is_liked: !img.is_liked,
                                likes_count: img.is_liked ? img.likes_count - 1 : img.likes_count + 1
                            };
                        }
                        return img;
                    })
                };
            }
            return r;
          })
        ),
      };
    });

    try {
        if (image.is_liked) {
            await supabase.from('image_likes').delete().eq('user_id', user.id).eq('image_id', imageId);
        } else {
            await supabase.from('image_likes').insert({ user_id: user.id, image_id: imageId });
        }
    } catch {
        // Revert
         queryClient.setQueryData<InfiniteData<FeedReview[]>>(queryKey, (oldData) => {
            if (!oldData) return undefined;
            return {
                ...oldData,
                pages: oldData.pages.map((page) =>
                page.map((r) => {
                    if (r.id === reviewId) {
                        return {
                            ...r,
                            images: r.images?.map(img => {
                                if (img.id === imageId) {
                                    return {
                                        ...img,
                                        is_liked: image.is_liked,
                                        likes_count: image.likes_count
                                    };
                                }
                                return img;
                            })
                        };
                    }
                    return r;
                })
                ),
            };
        });
    }
  };

  return {
    ...query,
    toggleLike,
    toggleImageLike,
    eventAttendance: eventAttendanceQuery.data ?? [],
    isEventAttendancePending: eventAttendanceQuery.isPending,
  };
}
