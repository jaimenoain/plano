import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyFeed } from "@/components/feed/EmptyFeed";
import { PeopleYouMayKnow } from "@/components/feed/PeopleYouMayKnow";
import { useAuth } from "@/hooks/useAuth";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { MetaHead } from "@/components/common/MetaHead";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { aggregateFeed } from "@/lib/feed-aggregation";
import { FeedHeroCard } from "@/components/feed/FeedHeroCard";
import { FeedClusterCard } from "@/components/feed/FeedClusterCard";
import { FeedCompactCard } from "@/components/feed/FeedCompactCard";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingMarquee } from "@/components/landing/LandingMarquee";
import { LandingFeatureGrid } from "@/components/landing/LandingFeatureGrid";
import { useFeed } from "@/hooks/useFeed";
import { useSuggestedFeed } from "@/hooks/useSuggestedFeed";
import { AllCaughtUpDivider } from "@/components/feed/AllCaughtUpDivider";
import { ExploreTeaserBlock } from "@/components/feed/ExploreTeaserBlock";
import { ReviewCard } from "@/components/feed/ReviewCard";
import React from "react";

// --- New Landing Page Component ---
function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col w-full overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-16 shadow-sm">
        <div className="container h-full mx-auto px-4 flex items-center justify-between">
          <div className="w-32">
            <PlanoLogo className="h-8 w-auto text-foreground [&_path]:fill-current" />
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="font-semibold bg-foreground text-background hover:bg-foreground/90 hover:text-background"
          >
            Log in
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full min-w-0 overflow-x-hidden">
        <LandingHero />
        <LandingMarquee />
        <div className="container mx-auto py-24 px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything you need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built for architecture enthusiasts, by architecture enthusiasts.
            </p>
          </div>
          <LandingFeatureGrid />
        </div>
      </main>
    </div>
  );
}

// --- Main Index Component ---

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useSidebar();
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="px-4 md:px-6 pt-6 md:pt-8 pb-24 mx-auto w-full">
            {socialReviews.length === 0 ? (
              <EmptyFeed />
            ) : (
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Feed Column */}
                <div className="w-full lg:w-2/3 flex flex-col gap-3 min-w-0 max-w-full">
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
                                <div className="py-2">
                                    <ExploreTeaserBlock />
                                </div>
                            )}
                        </React.Fragment>
                    );
                  })}

                  {/* Transition to Discovery */}
                  {!socialFeed.hasNextPage && (
                      <>
                        <AllCaughtUpDivider />

                        {/* Discovery Feed Items */}
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
                                    <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                                </div>
                            )}
                        </div>
                      </>
                  )}

                  {/* Load More Trigger / Loader */}
                  {(socialFeed.hasNextPage || discoveryFeed.hasNextPage) && (
                    <div ref={loadMoreRef} className="flex justify-center mt-4 py-8">
                      {(socialFeed.isFetchingNextPage || discoveryFeed.isFetchingNextPage) ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                      ) : (socialFeed.isError || discoveryFeed.isError) ? (
                         <Button
                          variant="ghost"
                          onClick={() => socialFeed.hasNextPage ? socialFeed.fetchNextPage() : discoveryFeed.fetchNextPage()}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Error loading more. Click to retry.
                        </Button>
                      ) : (
                         <Button
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground opacity-0"
                        >
                          Load More
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sidebar Column */}
                <div className="hidden lg:block lg:w-1/3 sticky top-20">
                   <div className="space-y-4">
                      <div className="p-5 border rounded-xl bg-card shadow-sm">
                         <h3 className="font-semibold mb-2">Trending</h3>
                         <p className="text-sm text-muted-foreground">
                           Discover popular buildings and active discussions in the community.
                           <br/><br/>
                           (Coming soon)
                         </p>
                      </div>
                      <PeopleYouMayKnow />
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </AppLayout>
  );
}
