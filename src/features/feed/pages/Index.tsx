import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyFeed } from "../components/EmptyFeed";
import { PeopleYouMayKnow } from "../components/PeopleYouMayKnow";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { MetaHead } from "@/components/common/MetaHead";
import { aggregateFeed } from "@/lib/feed-aggregation";
import { FeedHeroCard } from "../components/FeedHeroCard";
import { FeedClusterCard } from "../components/FeedClusterCard";
import { FeedCompactCard } from "../components/FeedCompactCard";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingMarquee } from "../components/landing/LandingMarquee";
import { LandingFeatureGrid } from "../components/landing/LandingFeatureGrid";
import { useFeed } from "../hooks/useFeed";
import { useSuggestedFeed } from "../hooks/useSuggestedFeed";
import { AllCaughtUpDivider } from "../components/AllCaughtUpDivider";
import { ExploreTeaserBlock } from "../components/ExploreTeaserBlock";
import { ReviewCard } from "../components/ReviewCard";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";

// --- New Landing Page Component ---
function Landing() {
  const navigate = useNavigate();

  return (
    <AppLayout
      variant="home"
      showNav={false}
      leftAction={
        <SidebarTrigger
          className="shrink-0 border border-border-default bg-surface-card/90 shadow-sm"
          aria-label="Open menu"
        />
      }
      rightAction={
        <Button
          variant="ghost"
          onClick={() => navigate("/auth")}
          className="h-10 px-4 font-medium bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover rounded-sm"
        >
          Log in
        </Button>
      }
    >
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
  const location = useLocation();
  const { isMobile: _isMobile } = useSidebar();
  const [showGroupActivity, setShowGroupActivity] = useState(true);
  const { containerRef: loadMoreRef, isVisible: isLoadMoreVisible } = useIntersectionObserver({
    rootMargin: "200px",
  });

  useEffect(() => {
    if (location.state?.reviewPosted) {
      setShowGroupActivity(true);
    }
  }, [location.state]);

  useEffect(() => {
    if (user && !authLoading) {
      if (!user.user_metadata?.onboarding_completed) {
        navigate("/onboarding");
      }
    }
  }, [user, authLoading, navigate]);

  // Social Feed
  const socialFeed = useFeed({ showGroupActivity });

  // Discovery Feed (Suggested)
  // Enable fetching only when social feed is exhausted or empty (though EmptyFeed handles empty case)
  // We want to append discovery content after social content.
  const shouldFetchDiscovery = !!user && (!socialFeed.hasNextPage && !socialFeed.isLoading);
  const discoveryFeed = useSuggestedFeed({ enabled: shouldFetchDiscovery });

  // Load More Logic
  useEffect(() => {
    if (isLoadMoreVisible) {
      if (socialFeed.hasNextPage && !socialFeed.isFetchingNextPage && !socialFeed.isError) {
        socialFeed.fetchNextPage();
      } else if (!socialFeed.hasNextPage && discoveryFeed.hasNextPage && !discoveryFeed.isFetchingNextPage && !discoveryFeed.isError) {
        discoveryFeed.fetchNextPage();
      }
    }
  }, [
    isLoadMoreVisible,
    socialFeed.hasNextPage, socialFeed.isFetchingNextPage, socialFeed.isError, socialFeed.fetchNextPage,
    discoveryFeed.hasNextPage, discoveryFeed.isFetchingNextPage, discoveryFeed.isError, discoveryFeed.fetchNextPage
  ]);

  const socialReviews = useMemo(() => socialFeed.data?.pages.flatMap((page) => page) || [], [socialFeed.data]);
  const aggregatedReviews = useMemo(() => aggregateFeed(socialReviews), [socialReviews]);

  const discoveryReviews = useMemo(() => discoveryFeed.data?.pages.flatMap((page) => page) || [], [discoveryFeed.data]);

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
    <AppLayout variant="home">
        <MetaHead title="Home" />
        {socialFeed.isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8 pb-24 mx-auto w-full">
            {socialReviews.length === 0 ? (
              <EmptyFeed />
            ) : (
              <div className="flex gap-8 items-start max-w-5xl mx-auto">
                {/* Feed Column */}
                <div className="flex-1 max-w-2xl min-w-0 flex flex-col gap-3">
                  {/* Social Feed Items */}
                  {aggregatedReviews.map((item, index) => {
                    const key = item.type === 'cluster' ? `cluster-${item.entries[0].id}` : item.entry.id;

                    let card = null;
                    if (item.type === 'hero') {
                        card = <FeedHeroCard key={key} entry={item.entry} onLike={socialFeed.toggleLike} onImageLike={socialFeed.toggleImageLike} />;
                    } else if (item.type === 'compact') {
                        card = <FeedCompactCard key={key} entry={item.entry} onLike={socialFeed.toggleLike} />;
                    } else if (item.type === 'cluster') {
                        card = <FeedClusterCard key={key} entries={item.entries} user={item.user} location={item.location} timestamp={item.timestamp} />;
                    }

                    return (
                        <React.Fragment key={key}>
                            {card}
                            {/* Interruptor every 10 items */}
                            {(index + 1) % 10 === 0 && (
                                <div key={`explore-teaser-${key}-${index}`} className="py-2">
                                    <WidgetErrorBoundary>
                                      <ExploreTeaserBlock />
                                    </WidgetErrorBoundary>
                                </div>
                            )}
                        </React.Fragment>
                    );
                  })}

                  {/* Transition to Discovery */}
                  {!socialFeed.hasNextPage && (
                      <>
                        <div className="mt-12 border-t border-border-default pt-8">
                          <AllCaughtUpDivider />
                        </div>

                        <div className="py-2">
                            <WidgetErrorBoundary>
                              <ExploreTeaserBlock />
                            </WidgetErrorBoundary>
                        </div>

                        {/* Discovery Feed Items */}
                        <WidgetErrorBoundary>
                        <div className="flex flex-col gap-6 mt-6">
                            {discoveryReviews.map((post) => (
                                <ReviewCard
                                    key={`discovery-${post.id}`}
                                    entry={post}
                                    onLike={discoveryFeed.toggleLike}
                                    onImageLike={discoveryFeed.toggleImageLike}
                                    showCommunityImages={true}
                                />
                            ))}
                            {/* Loader for initial fetch of discovery feed */}
                            {discoveryFeed.isLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
                                </div>
                            )}
                        </div>
                        </WidgetErrorBoundary>
                      </>
                  )}

                  {/* Load More Trigger / Loader */}
                  {(socialFeed.hasNextPage || discoveryFeed.hasNextPage) && (
                    <div ref={loadMoreRef} className="flex justify-center mt-4 py-8">
                      {(socialFeed.isFetchingNextPage || discoveryFeed.isFetchingNextPage) ? (
                        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
                      ) : (socialFeed.isError || discoveryFeed.isError) ? (
                         <Button
                          variant="ghost"
                          onClick={() => socialFeed.hasNextPage ? socialFeed.fetchNextPage() : discoveryFeed.fetchNextPage()}
                          className="text-text-secondary hover:text-text-primary"
                        >
                          Error loading more. Click to retry.
                        </Button>
                      ) : (
                         <Button
                          variant="ghost"
                          className="text-text-secondary hover:text-text-primary opacity-0"
                        >
                          Load More
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sidebar Column */}
                <div className="w-72 flex-shrink-0 hidden lg:block sticky top-20">
                  <div className="space-y-4">
                    <div className="p-6 border border-border-default rounded-sm bg-surface-card shadow-none">
                      <h3 className="font-semibold mb-2 text-text-primary">Trending</h3>
                      <p className="text-sm text-text-secondary">
                        Discover popular buildings and active discussions in the community.
                        <br />
                        <br />
                        (Coming soon)
                      </p>
                    </div>
                    <WidgetErrorBoundary>
                      <PeopleYouMayKnow />
                    </WidgetErrorBoundary>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </AppLayout>
  );
}
