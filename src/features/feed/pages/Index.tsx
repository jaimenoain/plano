import React, { useEffect, useMemo } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { LandingHero } from "../components/landing/LandingHero";
import { LandingMarquee } from "../components/landing/LandingMarquee";
import { LandingFeatureGrid } from "../components/landing/LandingFeatureGrid";
import { LandingNav } from "../components/landing/LandingNav";
import { LandingFooter } from "../components/landing/LandingFooter";
import { useFeed } from "../hooks/useFeed";
import { useSuggestedFeed } from "../hooks/useSuggestedFeed";
import { useCollectionsFeed } from "../hooks/useCollectionsFeed";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { FeedRightRail } from "../components/FeedRightRail";


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

  const socialFeed = useFeed({ showGroupActivity: true });
  /** Defer secondary RPCs until the primary feed returns — cuts parallel contention on first paint. */
  const primaryFeedReady = !socialFeed.isLoading;
  const collectionsFeed = useCollectionsFeed({ enabled: !!user && primaryFeedReady });
  const discoveryFeed = useSuggestedFeed({ enabled: !!user && primaryFeedReady });

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
  const mergedHomeRows = useMemo(
    () => mergeAggregatedFeedWithEventAttendance(aggregatedReviews, eventAttendance),
    [aggregatedReviews, eventAttendance],
  );
  const collectionItems = useMemo(
    () => collectionsFeed.data?.pages.flatMap((p) => p) || [],
    [collectionsFeed.data],
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

  return (
    <AppLayout>
      {showFeedLoader ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto bg-surface-default md:border-l md:border-r border-border-default min-h-screen">
          {socialReviews.length === 0 && eventAttendance.length === 0 ? (
            // --- Cold-start state ---
            <div className="px-4 md:px-6 lg:px-16 pb-32">
              <div className="flex flex-col gap-16 lg:gap-20 mt-16">
                <ColdStartFeed
                  discoveryReviews={discoveryReviews}
                  onLike={discoveryFeed.toggleLike}
                  onImageLike={discoveryFeed.toggleImageLike}
                  isDiscoveryLoading={discoveryFeed.isLoading}
                />
                {loadMoreActive && (
                  <LoadMoreTrigger
                    containerRef={loadMoreRef}
                    feeds={[socialFeed, collectionsFeed, discoveryFeed]}
                  />
                )}
              </div>
            </div>
          ) : (
            // --- Active feed state ---
            <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px]">
              <main className="min-w-0 md:border-r md:border-border-default overflow-hidden">
                <div className="px-4 md:px-6 lg:px-16 pt-10 pb-32">
                  <div className="flex flex-col gap-20">{feedStreamNodes}</div>

                  {loadMoreActive && (
                    <div ref={loadMoreRef} className="flex justify-center mt-16 py-4">
                      {socialFeed.isFetchingNextPage ||
                      collectionsFeed.isFetchingNextPage ||
                      discoveryFeed.isFetchingNextPage ? (
                        <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
                      ) : socialFeed.isError || collectionsFeed.isError || discoveryFeed.isError ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (socialFeed.isError && socialFeed.hasNextPage) void socialFeed.fetchNextPage();
                            else if (collectionsFeed.isError && collectionsFeed.hasNextPage) void collectionsFeed.fetchNextPage();
                            else if (discoveryFeed.isError && discoveryFeed.hasNextPage) void discoveryFeed.fetchNextPage();
                          }}
                          className="text-xs font-medium tracking-[0.18em] uppercase text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Error loading more. Click to retry.
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </main>
              <FeedRightRail activities={activityEntries} />
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

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
