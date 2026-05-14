import React, { useEffect, useMemo, useCallback } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ColdStartFeed } from "../components/ColdStartFeed";
import { FeedCollectionCard } from "../components/FeedCollectionCard";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import {
  aggregateFeed,
  mergeAggregatedFeedWithEventAttendance,
  type AggregatedFeedItem,
  type MergedHomeFeedRow,
} from "@/lib/feed-aggregation";
import { ReviewCardFeed } from "../components/ReviewCardFeed";
import { resolveCardType } from "../utils/resolveCardType";
import type { FeedCollection, FeedReview } from "@/types/feed";
import type { FeedItem, FeedItemPost } from "@/types/feedItem";
export type { FeedItem };
import { LandingHero } from "../components/landing/LandingHero";
import { LandingMarquee } from "../components/landing/LandingMarquee";
import { LandingFeatureGrid } from "../components/landing/LandingFeatureGrid";
import { LandingNav } from "../components/landing/LandingNav";
import { LandingFooter } from "../components/landing/LandingFooter";
import { useFeed } from "../hooks/useFeed";
import { useSuggestedFeed } from "../hooks/useSuggestedFeed";
import { useCollectionsFeed } from "../hooks/useCollectionsFeed";
import { useSeenItems } from "../hooks/useSeenItems";
import { useExploreShell } from "@/components/layout/ExploreShellContext";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { FeedRightRail } from "../components/FeedRightRail";
import { isFeedV2RankerEnabled } from "../flags";
import { getFeedRanked } from "../api/getFeedRanked";
import { getCollectionsFeedAsItems } from "../api/getCollectionsFeedAsItems";
import { getSuggestedPostsAsItems } from "../api/getSuggestedPostsAsItems";
import { getFeedExtended } from "../api/getFeedExtended";
import { getBuildingSpotlights } from "../api/getBuildingSpotlights";
import { getEditorialSlots } from "../api/getEditorialSlots";
import { getFeedClusters } from "../api/getFeedClusters";
import { mergeFeedSources } from "../utils/mergeFeedSources";
import { FeedMosaic } from "../components/FeedMosaic";


const INDEX_TITLE = "Plano — The world's architecture, cataloged.";
const INDEX_DESCRIPTION =
  "Track your architecture visits, rate buildings, and discover what friends are exploring.";
const INDEX_CANONICAL = `${SITE_URL}/`;
const INDEX_OG_IMAGE = `${SITE_URL}/cover.jpg`;

export const meta: MetaFunction = () => [
  { title: INDEX_TITLE },
  { name: "description", content: INDEX_DESCRIPTION },
  { property: "og:title", content: INDEX_TITLE },
  { property: "og:description", content: INDEX_DESCRIPTION },
  { property: "og:image", content: INDEX_OG_IMAGE },
  { property: "og:type", content: "website" },
  { property: "og:url", content: INDEX_CANONICAL },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: INDEX_TITLE },
  { name: "twitter:description", content: INDEX_DESCRIPTION },
  { name: "twitter:image", content: INDEX_OG_IMAGE },
  { tagName: "link", rel: "canonical", href: INDEX_CANONICAL },
  {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "url": SITE_URL,
      "name": "Plano",
      "description": "The world's architecture, cataloged.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${SITE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  },
];

// --- Landing page (logged-out) ---
function Landing() {
  const { setLandingHideTopChrome } = useExploreShell();
  useEffect(() => {
    setLandingHideTopChrome(true);
    return () => setLandingHideTopChrome(false);
  }, [setLandingHideTopChrome]);

  return (
    <AppLayout showNav={false} showFooter={false}>
      <LandingNav />
      <main className="flex-1 w-full min-w-0 overflow-x-hidden">
        <LandingHero />
        <LandingMarquee />
        <section className="max-w-5xl mx-auto py-24 px-5 md:px-8">
          <div className="mb-16 space-y-3">
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-text-disabled">
              What we're building
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary max-w-xl">
              A permanent record of the built world.
            </h2>
          </div>
          <LandingFeatureGrid />
        </section>
      </main>
      <LandingFooter />
    </AppLayout>
  );
}

// --- Main Index Component ---
export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { containerRef: loadMoreRef, isVisible: isLoadMoreVisible } = useIntersectionObserver({
    rootMargin: "200px",
  });

  useEffect(() => {
    if (user && !authLoading) {
      if (!user.user_metadata?.onboarding_completed) {
        navigate("/onboarding");
      }
    }
  }, [user, authLoading, navigate]);

  const { data: followingCount } = useQuery({
    queryKey: ["following-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const socialFeed = useFeed({ showGroupActivity: true, enabled: !isFeedV2RankerEnabled() });
  /** Defer secondary RPCs until the primary feed returns — cuts parallel contention on first paint. (Only used in legacy path) */
  const primaryFeedReady = !socialFeed.isLoading;
  const collectionsFeed = useCollectionsFeed({ enabled: !!user && primaryFeedReady && !isFeedV2RankerEnabled() });
  const discoveryFeed = useSuggestedFeed({ enabled: !!user && primaryFeedReady && !isFeedV2RankerEnabled() });

  // ── V2 unified stream queries ──────────────────────────────────────────────
  const seenItems = useSeenItems();

  const v2SocialQuery = useQuery({
    queryKey: ["v2-social-feed", user?.id],
    queryFn: () => getFeedRanked({ limit: 30 }),
    enabled: !!user && isFeedV2RankerEnabled(),
    staleTime: 60 * 1000,
  });

  const v2CollectionsQuery = useQuery({
    queryKey: ["v2-collections-feed", user?.id],
    queryFn: () => getCollectionsFeedAsItems({ limit: 30 }),
    enabled: !!user && isFeedV2RankerEnabled(),
    staleTime: 60 * 1000,
  });

  const v2DiscoveryQuery = useQuery({
    queryKey: ["v2-discovery-feed", user?.id],
    queryFn: () => getSuggestedPostsAsItems({ limit: 30 }),
    enabled: !!user && isFeedV2RankerEnabled(),
    staleTime: 60 * 1000,
  });

  const v2ExtendedQuery = useQuery({
    queryKey: ["v2-extended-feed", user?.id],
    queryFn: () => getFeedExtended({ limit: 30 }),
    enabled: !!user && isFeedV2RankerEnabled(),
    staleTime: 60 * 1000,
  });

  const v2SpotlightsQuery = useQuery({
    queryKey: ["v2-spotlights-feed", user?.id],
    queryFn: () => getBuildingSpotlights({ limit: 20 }),
    enabled: !!user && isFeedV2RankerEnabled(),
    staleTime: 5 * 60 * 1000, // spotlights are activity-driven; 5-min stale is fine
  });

  const v2EditorialQuery = useQuery({
    queryKey: ["v2-editorial-feed", user?.id],
    queryFn: () => getEditorialSlots(),
    enabled: !!user && isFeedV2RankerEnabled(),
    staleTime: 15 * 60 * 1000, // editorial slots change at most every 15 min (trending TTL)
  });

  const v2ClustersQuery = useQuery({
    queryKey: ["v2-clusters-feed", user?.id],
    queryFn: () => getFeedClusters({ limit: 20 }),
    enabled: !!user && isFeedV2RankerEnabled(),
    staleTime: 5 * 60 * 1000, // clusters are activity-driven; 5-min stale is fine
  });

  const v2Items = useMemo(() => {
    if (!isFeedV2RankerEnabled()) return [];
    const social = v2SocialQuery.data ?? [];
    const collections = v2CollectionsQuery.data ?? [];
    const discovery = v2DiscoveryQuery.data ?? [];
    const extended = v2ExtendedQuery.data ?? [];
    const spotlights = v2SpotlightsQuery.data ?? [];
    const editorial = v2EditorialQuery.data ?? [];
    const clusters = v2ClustersQuery.data ?? [];
    return mergeFeedSources(social, collections, discovery, extended, spotlights, seenItems.hasSeen, editorial, clusters);
  }, [v2SocialQuery.data, v2CollectionsQuery.data, v2DiscoveryQuery.data, v2ExtendedQuery.data, v2SpotlightsQuery.data, v2EditorialQuery.data, v2ClustersQuery.data, seenItems.hasSeen]);
  // ──────────────────────────────────────────────────────────────────────────

  const handleV2Like = useCallback(async (reviewId: string) => {
    if (!user) return;

    const queries = [
      { key: ["v2-social-feed", user.id], query: v2SocialQuery },
      { key: ["v2-discovery-feed", user.id], query: v2DiscoveryQuery },
      { key: ["v2-collections-feed", user.id], query: v2CollectionsQuery },
      { key: ["v2-extended-feed", user.id], query: v2ExtendedQuery },
    ];

    // Optimistic Update across all relevant V2 queries
    for (const { key } of queries) {
      const currentData = queryClient.getQueryData<FeedItem[]>(key);
      if (!currentData) continue;

      queryClient.setQueryData<FeedItem[]>(key, (old) => {
        if (!old) return [];
        return old.map((item) => {
          if (item.kind === "post" && item.payload.id === reviewId) {
            const isLiked = !item.payload.is_liked;
            return {
              ...item,
              payload: {
                ...item.payload,
                is_liked: isLiked,
                likes_count: isLiked ? item.payload.likes_count + 1 : item.payload.likes_count - 1,
              },
            };
          }
          return item;
        });
      });
    }

    try {
      const isLiked = v2SocialQuery.data?.find(i => i.id === reviewId && i.kind === "post")?.payload.is_liked ?? false;
      if (isLiked) {
        await supabase.from("likes").delete().eq("interaction_id", reviewId).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ interaction_id: reviewId, user_id: user.id });
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
      // Invalidate to recover
      queries.forEach(({ key }) => queryClient.invalidateQueries({ queryKey: key }));
    }
  }, [user, queryClient, v2SocialQuery.data, v2DiscoveryQuery, v2CollectionsQuery, v2ExtendedQuery]);

  const handleV2ImageLike = useCallback(async (reviewId: string, imageId: string) => {
    if (!user) return;

    const queries = [
      { key: ["v2-social-feed", user.id] },
      { key: ["v2-discovery-feed", user.id] },
      { key: ["v2-collections-feed", user.id] },
      { key: ["v2-extended-feed", user.id] },
    ];

    for (const { key } of queries) {
      queryClient.setQueryData<FeedItem[]>(key, (old) => {
        if (!old) return [];
        return old.map((item) => {
          if (item.kind === "post" && item.payload.id === reviewId) {
            return {
              ...item,
              payload: {
                ...item.payload,
                images: item.payload.images?.map((img) => {
                  if (img.id === imageId) {
                    const isLiked = !img.is_liked;
                    return {
                      ...img,
                      is_liked: isLiked,
                      likes_count: isLiked ? img.likes_count + 1 : img.likes_count - 1,
                    };
                  }
                  return img;
                }),
              },
            };
          }
          return item;
        });
      });
    }

    try {
      // Check current state from any source
      const img = v2SocialQuery.data?.find(i => i.id === reviewId && i.kind === "post")?.payload.images?.find(im => im.id === imageId);
      if (img?.is_liked) {
        await supabase.from("image_likes").delete().eq("user_id", user.id).eq("image_id", imageId);
      } else {
        await supabase.from("image_likes").insert({ user_id: user.id, image_id: imageId });
      }
    } catch (err) {
      console.error("Failed to toggle image like:", err);
      queries.forEach(({ key }) => queryClient.invalidateQueries({ queryKey: key }));
    }
  }, [user, queryClient, v2SocialQuery.data]);

  useEffect(() => {
    if (!isLoadMoreVisible) return;
    if (socialFeed.hasNextPage && !socialFeed.isFetchingNextPage && !socialFeed.isError) {
      void socialFeed.fetchNextPage();
    } else if (
      !socialFeed.hasNextPage &&
      collectionsFeed.hasNextPage &&
      !collectionsFeed.isFetchingNextPage &&
      !collectionsFeed.isError
    ) {
      void collectionsFeed.fetchNextPage();
    } else if (
      !socialFeed.hasNextPage &&
      !collectionsFeed.hasNextPage &&
      discoveryFeed.hasNextPage &&
      !discoveryFeed.isFetchingNextPage &&
      !discoveryFeed.isError
    ) {
      void discoveryFeed.fetchNextPage();
    }
  }, [
    isLoadMoreVisible,
    socialFeed.hasNextPage,
    socialFeed.isFetchingNextPage,
    socialFeed.isError,
    socialFeed.fetchNextPage,
    collectionsFeed.hasNextPage,
    collectionsFeed.isFetchingNextPage,
    collectionsFeed.isError,
    collectionsFeed.fetchNextPage,
    discoveryFeed.hasNextPage,
    discoveryFeed.isFetchingNextPage,
    discoveryFeed.isError,
    discoveryFeed.fetchNextPage,
  ]);

  const socialReviews = useMemo(
    () => socialFeed.data?.pages.flatMap((page) => page) || [],
    [socialFeed.data],
  );

  const activityEntries = useMemo(
    () => socialReviews.filter((r) => resolveCardType(r) === "activity").slice(0, 6),
    [socialReviews],
  );

  const aggregatedReviews = useMemo(() => aggregateFeed(socialReviews), [socialReviews]);
  const eventAttendance = socialFeed.eventAttendance ?? [];
  const mergedHomeRows = useMemo(() => {
    const rows = mergeAggregatedFeedWithEventAttendance(aggregatedReviews, eventAttendance);
    const firstHeroIdx = rows.findIndex(
      (r) => r.kind === "aggregated" && r.item.type === "hero",
    );
    if (firstHeroIdx > 0) {
      const hero = rows[firstHeroIdx];
      return [hero, ...rows.slice(0, firstHeroIdx), ...rows.slice(firstHeroIdx + 1)];
    }
    return rows;
  }, [aggregatedReviews, eventAttendance]);
  const collectionItems = useMemo(
    () => collectionsFeed.data?.pages.flatMap((p) => p) || [],
    [collectionsFeed.data],
  );
  const v2DiscoveryReviews = useMemo(
    () => (v2DiscoveryQuery.data ?? [])
      .filter((i): i is FeedItemPost => i.kind === "post")
      .map(i => i.payload),
    [v2DiscoveryQuery.data]
  );

  const discoveryReviews = useMemo(
    () => discoveryFeed.data?.pages.flatMap((page) => page) || [],
    [discoveryFeed.data],
  );

  const loadMoreActive =
    socialFeed.hasNextPage || collectionsFeed.hasNextPage || discoveryFeed.hasNextPage;

  /** When the social feed has rows, render immediately and merge event attendance when it arrives. When it is empty, wait for attendance so we do not flash cold-start before switching to an attendance-only stream. */
  const showFeedLoader =
    socialFeed.isLoading ||
    (socialReviews.length === 0 && socialFeed.isEventAttendancePending);

  const feedStreamNodes = useMemo(
    () =>
      buildActiveFeedNodes(
        mergedHomeRows,
        collectionItems,
        discoveryReviews,
        socialFeed.toggleLike,
        socialFeed.toggleImageLike,
        discoveryFeed.toggleLike,
        discoveryFeed.toggleImageLike,
      ),
    [
      mergedHomeRows,
      collectionItems,
      discoveryReviews,
      socialFeed.toggleLike,
      socialFeed.toggleImageLike,
      discoveryFeed.toggleLike,
      discoveryFeed.toggleImageLike,
    ],
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  // ── V2 unified stream render path ──────────────────────────────────────────
  if (isFeedV2RankerEnabled()) {
    const v2Loading = v2SocialQuery.isLoading;
    return (
      <AppLayout>
        {v2Loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
          </div>
        ) : (
          <div className="w-full max-w-7xl mx-auto bg-surface-default md:border-l md:border-r border-border-default min-h-screen">
            <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px]">
              <main className="min-w-0 md:border-r md:border-border-default">
                <div className="pt-10 pb-32">
                  {v2Items.length === 0 ? (
                    <div className="px-4 md:px-6 lg:px-16">
                      <ColdStartFeed
                        discoveryReviews={v2DiscoveryReviews}
                        onLike={handleV2Like}
                        onImageLike={handleV2ImageLike}
                        isDiscoveryLoading={v2DiscoveryQuery.isLoading}
                        isEmptyFeed={(followingCount ?? 0) > 0}
                        hideSuggestions={(followingCount ?? 0) === 0}
                      />
                    </div>
                  ) : (
                    <FeedMosaic
                      items={v2Items}
                      followingCount={followingCount ?? 0}
                      onLike={handleV2Like}
                      onImageLike={handleV2ImageLike}
                    />
                  )}
                  {(v2CollectionsQuery.isLoading || v2DiscoveryQuery.isLoading || v2ExtendedQuery.isLoading || v2SpotlightsQuery.isLoading || v2EditorialQuery.isLoading) && (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
                    </div>
                  )}
                </div>
              </main>
              <FeedRightRail activities={activityEntries} />
            </div>
          </div>
        )}
      </AppLayout>
    );
  }
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      {showFeedLoader ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto bg-surface-default md:border-l md:border-r border-border-default min-h-screen">
          <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0 md:border-r md:border-border-default overflow-hidden">
              <div className="px-4 md:px-6 lg:px-16 pt-10 pb-32">
                {socialReviews.length === 0 && eventAttendance.length === 0 ? (
                  <ColdStartFeed
                    discoveryReviews={discoveryReviews}
                    onLike={discoveryFeed.toggleLike}
                    onImageLike={discoveryFeed.toggleImageLike}
                    isDiscoveryLoading={discoveryFeed.isLoading}
                    isEmptyFeed={(followingCount ?? 0) > 0}
                    hideSuggestions={(followingCount ?? 0) === 0}
                  />
                ) : (
                  <div className="flex flex-col gap-20">{feedStreamNodes}</div>
                )}

                {loadMoreActive && (
                  <div className="mt-16">
                    <LoadMoreTrigger
                      containerRef={loadMoreRef}
                      feeds={[socialFeed, collectionsFeed, discoveryFeed]}
                    />
                  </div>
                )}
              </div>
            </main>
            <FeedRightRail activities={activityEntries} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function buildActiveFeedNodes(
  mergedHomeRows: MergedHomeFeedRow[],
  collectionItems: FeedCollection[],
  discoveryReviews: FeedReview[],
  socialToggleLike: (id: string) => void,
  socialToggleImageLike: (reviewId: string, imageId: string) => void,
  discoveryToggleLike: (id: string) => void,
  discoveryToggleImageLike: (reviewId: string, imageId: string) => void,
): React.ReactNode[] {
  const feedNodes: React.ReactNode[] = [];
  /** Cards actually rendered (activity rows are skipped — row count alone can hit n % 4 before any card). */
  let feedCardsRendered = 0;

  const processEntry = (
    entry: FeedReview,
    onLike: (id: string) => void,
    onImageLike: (reviewId: string, imageId: string) => void,
  ) => {
    const t = resolveCardType(entry);
    if (t === "activity") return;
    feedCardsRendered += 1;
    feedNodes.push(
      <div key={entry.id}>
        <ReviewCardFeed entry={entry} onLike={onLike} onImageLike={onImageLike} />
      </div>,
    );
  };

  const processAggregatedItem = (item: AggregatedFeedItem) => {
    switch (item.type) {
      case "cluster":
        item.entries.forEach((e) => processEntry(e, socialToggleLike, socialToggleImageLike));
        break;
      case "row":
        processEntry(item.left.entry, socialToggleLike, socialToggleImageLike);
        processEntry(item.right.entry, socialToggleLike, socialToggleImageLike);
        break;
      case "hero":
      case "compact":
      case "activity":
        processEntry(item.entry, socialToggleLike, socialToggleImageLike);
        break;
      default: {
        const _e: never = item;
        return _e;
      }
    }
  };

  let collectionCursor = 0;
  let discoveryCursor = 0;

  mergedHomeRows.forEach((row, index) => {
    if (row.kind === "event_attendance") {
      feedCardsRendered += 1;
      feedNodes.push(
        <div key={`feed-attendance-${row.entry.eventId}`}>
          <ReviewCardFeed entry={row.entry} />
        </div>,
      );
    } else {
      processAggregatedItem(row.item);
    }
    const n = index + 1;
    if (
      n % 4 === 0 &&
      n >= 8 &&
      feedCardsRendered >= 1 &&
      collectionCursor < collectionItems.length
    ) {
      const batch = collectionItems.slice(collectionCursor, collectionCursor + 3);
      collectionCursor += batch.length;
      feedNodes.push(
        <div key={`collections-${n}`} className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-disabled">
            Collections
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {batch.map((col) => (
              <WidgetErrorBoundary key={col.id}>
                <FeedCollectionCard collection={col} />
              </WidgetErrorBoundary>
            ))}
          </div>
        </div>,
      );
    }
    if (n % 8 === 0) {
      if (discoveryCursor < discoveryReviews.length) {
        const post = discoveryReviews[discoveryCursor];
        discoveryCursor += 1;
        processEntry(post, discoveryToggleLike, discoveryToggleImageLike);
      }
    }
  });

  return feedNodes;
}

// Extracted load-more trigger for cold-start path
function LoadMoreTrigger({
  containerRef,
  feeds,
}: {
  containerRef: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
  feeds: Array<{ isFetchingNextPage: boolean; isError: boolean; hasNextPage: boolean; fetchNextPage: () => void }>;
}) {
  const loading = feeds.some((f) => f.isFetchingNextPage);
  const hasError = feeds.some((f) => f.isError);
  if (!loading && !hasError) return null;
  return (
    <div ref={containerRef} className="flex justify-center py-4">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
      ) : (
        <button
          type="button"
          onClick={() => feeds.find((f) => f.isError && f.hasNextPage)?.fetchNextPage()}
          className="text-xs font-medium tracking-[0.18em] uppercase text-text-secondary hover:text-text-primary transition-colors"
        >
          Error loading more. Click to retry.
        </button>
      )}
    </div>
  );
}
