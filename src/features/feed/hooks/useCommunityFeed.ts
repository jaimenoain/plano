import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  communityFeedKey,
  fetchCommunityFeedPage,
} from "@/features/feed/api/feedApi";
import { useFeedLikes } from "@/features/feed/hooks/useFeedLikes";

const PAGE_SIZE = 20;

/**
 * "Discover from the community" — posts from authors the viewer does not follow,
 * ranked by popularity, location relevance and social proximity. Items carry
 * `connectors` ("Followed by XYZ"), `suggestion_reason` and `location_match`.
 * This is the unbounded section that drives the page's infinite scroll.
 */
export function useCommunityFeed() {
  const { user } = useAuth();
  const queryKey = communityFeedKey(user?.id);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];
      return fetchCommunityFeedPage(PAGE_SIZE, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE
        ? (lastPageParam as number) + PAGE_SIZE
        : undefined,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const reviews = query.data?.pages.flat() ?? [];
  const { toggleLike, toggleImageLike } = useFeedLikes(queryKey);

  return {
    reviews,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    toggleLike,
    toggleImageLike,
  };
}
