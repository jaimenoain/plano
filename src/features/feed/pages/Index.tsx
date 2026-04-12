import React, { useEffect, useMemo } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { ColdStartFeed } from "../components/ColdStartFeed";
import { FeedCollectionCard } from "../components/FeedCollectionCard";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { aggregateFeed, type AggregatedFeedItem } from "@/lib/feed-aggregation";
import { FeedClusterCard } from "../components/FeedClusterCard";
import { CardTypeA } from "../components/CardTypeA";
import { CardTypeB } from "../components/CardTypeB";
import { CardTypeC } from "../components/CardTypeC";
import { ActivityStreamGroup } from "../components/ActivityStream";
import { resolveCardType } from "../utils/resolveCardType";
import type { FeedReview } from "@/types/feed";
import { SectionDivider } from "../components/SectionDivider";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingMarquee } from "../components/landing/LandingMarquee";
import { LandingFeatureGrid } from "../components/landing/LandingFeatureGrid";
import { useFeed } from "../hooks/useFeed";
import { useSuggestedFeed } from "../hooks/useSuggestedFeed";
import { useCollectionsFeed } from "../hooks/useCollectionsFeed";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";

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
];

// --- Landing page (logged-out) ---
function Landing() {
  const navigate = useNavigate();
  return (
    <AppLayout showNav={false}>
      <div className="pointer-events-none fixed right-4 top-4 z-40 safe-area-pt">
        <Button
          variant="ghost"
          onClick={() => navigate("/auth")}
          className="pointer-events-auto h-10 px-4 font-medium bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover rounded-sm shadow-md"
        >
          Log in
        </Button>
      </div>
      <main className="flex-1 w-full min-w-0 overflow-x-hidden">
        <LandingHero />
        <LandingMarquee />
        <div className="container mx-auto py-24 px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-text-primary">
              Everything you need
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Built for architecture enthusiasts, by architecture enthusiasts.
            </p>
          </div>
          <LandingFeatureGrid />
        </div>
      </main>
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
  const collectionsFeed = useCollectionsFeed({ enabled: !!user });
  const discoveryFeed = useSuggestedFeed({ enabled: !!user });

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
    [socialFeed.data]
  );
  const aggregatedReviews = useMemo(() => aggregateFeed(socialReviews), [socialReviews]);
  const collectionItems = useMemo(
    () => collectionsFeed.data?.pages.flatMap((p) => p) || [],
    [collectionsFeed.data]
  );
  const discoveryReviews = useMemo(
    () => discoveryFeed.data?.pages.flatMap((page) => page) || [],
    [discoveryFeed.data]
  );

  const loadMoreActive =
    socialFeed.hasNextPage || collectionsFeed.hasNextPage || discoveryFeed.hasNextPage;

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
      {socialFeed.isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
        </div>
      ) : (
        <div className="p-4 sm:p-6 lg:p-8 pb-24 mx-auto w-full">
          {socialReviews.length === 0 ? (
            // --- Cold-start state: new user with no social feed yet ---
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col gap-16 lg:gap-20">
                <ColdStartFeed
                  discoveryReviews={discoveryReviews}
                  onLike={discoveryFeed.toggleLike}
                  onImageLike={discoveryFeed.toggleImageLike}
                  isDiscoveryLoading={discoveryFeed.isLoading}
                />
                {loadMoreActive && (
                  <div ref={loadMoreRef} className="flex justify-center mt-4 py-8">
                    {socialFeed.isFetchingNextPage ||
                    collectionsFeed.isFetchingNextPage ||
                    discoveryFeed.isFetchingNextPage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
                    ) : socialFeed.isError || collectionsFeed.isError || discoveryFeed.isError ? (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (socialFeed.isError && socialFeed.hasNextPage) {
                            void socialFeed.fetchNextPage();
                          } else if (collectionsFeed.isError && collectionsFeed.hasNextPage) {
                            void collectionsFeed.fetchNextPage();
                          } else if (discoveryFeed.isError && discoveryFeed.hasNextPage) {
                            void discoveryFeed.fetchNextPage();
                          }
                        }}
                        className="text-text-secondary hover:text-text-primary"
                      >
                        Error loading more. Click to retry.
                      </Button>
                    ) : (
                      <Button variant="ghost" className="text-text-secondary hover:text-text-primary opacity-0">
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // --- Active feed state ---
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col">
                {(() => {
                  const feedNodes: React.ReactNode[] = [];
                  const activityBuffer: FeedReview[] = [];
                  let cardBIndex = 0;

                  const flushActivity = () => {
                    if (activityBuffer.length === 0) return;
                    const entries = activityBuffer.splice(0, activityBuffer.length);
                    feedNodes.push(
                      <div
                        key={`activity-${entries.map((e) => e.id).join("-")}`}
                        className="border-b border-border-default pb-10 mb-10"
                      >
                        <ActivityStreamGroup entries={entries} />
                      </div>,
                    );
                  };

                  const renderGridCell = (
                    entry: FeedReview,
                    onLike: (id: string) => void,
                    onImageLike: (reviewId: string, imageId: string) => void,
                  ): React.ReactNode => {
                    const t = resolveCardType(entry);
                    if (t === "activity") {
                      return <ActivityStreamGroup entries={[entry]} />;
                    }
                    switch (t) {
                      case "A":
                        return <CardTypeA entry={entry} onLike={onLike} />;
                      case "B":
                        return (
                          <CardTypeB
                            entry={entry}
                            index={cardBIndex++}
                            onLike={onLike}
                            onImageLike={onImageLike}
                          />
                        );
                      case "C":
                        return (
                          <CardTypeC entry={entry} onLike={onLike} onImageLike={onImageLike} />
                        );
                      default: {
                        const _n: never = t;
                        return _n;
                      }
                    }
                  };

                  const processEntry = (
                    entry: FeedReview,
                    onLike: (id: string) => void,
                    onImageLike: (reviewId: string, imageId: string) => void,
                  ) => {
                    const t = resolveCardType(entry);
                    if (t === "activity") {
                      activityBuffer.push(entry);
                      return;
                    }
                    flushActivity();
                    const inner = renderGridCell(entry, onLike, onImageLike);
                    feedNodes.push(
                      <div
                        key={entry.id}
                        className="border-b border-border-default pb-10 mb-10"
                      >
                        {inner}
                      </div>,
                    );
                  };

                  const processAggregatedItem = (item: AggregatedFeedItem) => {
                    switch (item.type) {
                      case "cluster": {
                        flushActivity();
                        const key = `cluster-${item.entries[0]?.id ?? "unknown"}`;
                        feedNodes.push(
                          <div
                            key={key}
                            className="border-b border-border-default pb-10 mb-10"
                          >
                            <FeedClusterCard
                              entries={item.entries}
                              user={item.user}
                              location={item.location}
                              timestamp={item.timestamp}
                            />
                          </div>,
                        );
                        break;
                      }
                      case "row": {
                        flushActivity();
                        const key = `row-${item.left.entry.id}-${item.right.entry.id}`;
                        feedNodes.push(
                          <div key={key} className="border-b border-border-default pb-10 mb-10">
                            <div className="grid grid-cols-2 gap-8 w-full">
                              <div className="min-w-0">
                                {renderGridCell(
                                  item.left.entry,
                                  socialFeed.toggleLike,
                                  socialFeed.toggleImageLike,
                                )}
                              </div>
                              <div className="min-w-0">
                                {renderGridCell(
                                  item.right.entry,
                                  socialFeed.toggleLike,
                                  socialFeed.toggleImageLike,
                                )}
                              </div>
                            </div>
                          </div>,
                        );
                        break;
                      }
                      case "hero":
                      case "compact":
                      case "activity":
                        processEntry(
                          item.entry,
                          socialFeed.toggleLike,
                          socialFeed.toggleImageLike,
                        );
                        break;
                      default: {
                        const _e: never = item;
                        return _e;
                      }
                    }
                  };

                  let collectionCursor = 0;
                  let discoveryCursor = 0;
                  let hasShownDivider = false;

                  aggregatedReviews.forEach((item, index) => {
                    processAggregatedItem(item);
                    const n = index + 1;
                    if (n % 4 === 0 && collectionCursor < collectionItems.length) {
                      flushActivity();
                      const col = collectionItems[collectionCursor];
                      collectionCursor += 1;
                      feedNodes.push(
                        <WidgetErrorBoundary key={`collection-inject-${col.id}-${n}`}>
                          <div className="border-b border-border-default pb-10 mb-10">
                            <FeedCollectionCard collection={col} />
                          </div>
                        </WidgetErrorBoundary>,
                      );
                    }
                    if (n % 8 === 0) {
                      if (!hasShownDivider) {
                        hasShownDivider = true;
                        feedNodes.push(
                          <SectionDivider
                            key="feed-section-from-community"
                            label="From the community"
                            href="/explore"
                          />,
                        );
                      }
                      if (discoveryCursor < discoveryReviews.length) {
                        const post = discoveryReviews[discoveryCursor];
                        discoveryCursor += 1;
                        processEntry(
                          post,
                          discoveryFeed.toggleLike,
                          discoveryFeed.toggleImageLike,
                        );
                      }
                    }
                  });
                  flushActivity();
                  return feedNodes;
                })()}
                {loadMoreActive && (
                  <div ref={loadMoreRef} className="flex justify-center mt-4 py-8">
                    {socialFeed.isFetchingNextPage ||
                    collectionsFeed.isFetchingNextPage ||
                    discoveryFeed.isFetchingNextPage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
                    ) : socialFeed.isError || collectionsFeed.isError || discoveryFeed.isError ? (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (socialFeed.isError && socialFeed.hasNextPage) {
                            void socialFeed.fetchNextPage();
                          } else if (collectionsFeed.isError && collectionsFeed.hasNextPage) {
                            void collectionsFeed.fetchNextPage();
                          } else if (discoveryFeed.isError && discoveryFeed.hasNextPage) {
                            void discoveryFeed.fetchNextPage();
                          }
                        }}
                        className="text-text-secondary hover:text-text-primary"
                      >
                        Error loading more. Click to retry.
                      </Button>
                    ) : (
                      <Button variant="ghost" className="text-text-secondary hover:text-text-primary opacity-0">
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}