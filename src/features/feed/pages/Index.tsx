import { useEffect, useRef } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useExploreShell } from "@/components/layout/ExploreShellContext";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { ReviewCardFeed } from "@/features/posts/components/ReviewCardFeed";
import { useHomeFeed } from "@/features/feed/hooks/useHomeFeed";
import { Button } from "@/components/ui/button";

import { LandingHero } from "../components/landing/LandingHero";
import { LandingMarquee } from "../components/landing/LandingMarquee";
import { LandingFeatureGrid } from "../components/landing/LandingFeatureGrid";
import { LandingNav } from "../components/landing/LandingNav";
import { LandingFooter } from "../components/landing/LandingFooter";
import { FeedSidebar } from "../components/FeedSidebar";

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

function FeedSkeleton() {
  return (
    <div className="space-y-16">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-4 border-b border-border-default pb-16">
          <div className="h-3 w-40 rounded-none bg-surface-muted" />
          <div className="h-12 w-4/5 max-w-lg rounded-none bg-surface-muted" />
          <div className="h-4 w-32 rounded-none bg-surface-muted" />
          <div className="aspect-card-hero w-full rounded-none bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

function Feed() {
  const {
    reviews,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    toggleLike,
    toggleImageLike,
  } = useHomeFeed();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[960px] px-4 md:px-6 pt-10 pb-32 md:flex md:items-start md:gap-8">
        <main className="w-full md:flex-1 md:min-w-0">
          <header className="mb-10 border-b border-border-default pb-6">
            <p className="text-2xs-plus font-mono font-normal uppercase tracking-[0.2em] text-text-disabled mb-2">
              Your feed
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
              Latest
            </h1>
          </header>

          {isLoading ? (
            <FeedSkeleton />
          ) : isError ? (
            <div
              className="rounded-none border border-border-default bg-surface-card px-6 py-12 text-center"
              role="alert"
            >
              <p className="text-sm text-text-secondary">
                Couldn&apos;t load the feed. Please refresh.
              </p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-none border border-border-default bg-surface-card px-6 py-12 text-center">
              <p className="text-sm text-text-secondary">
                No posts yet. Follow people or share a building visit to fill your feed.
              </p>
            </div>
          ) : (
            <div className="space-y-16">
              {reviews.map((entry) => (
                <ReviewCardFeed
                  key={entry.id}
                  entry={entry}
                  onLike={toggleLike}
                  onImageLike={toggleImageLike}
                />
              ))}
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isFetchingNextPage ? (
                  <Loader2
                    className="h-6 w-6 animate-spin text-text-secondary"
                    aria-label="Loading more"
                  />
                ) : hasNextPage ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none"
                    onClick={() => void fetchNextPage()}
                  >
                    Load more
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </main>

        <aside className="hidden md:block md:w-1/3 md:shrink-0">
          <div className="sticky top-20">
            <FeedSidebar />
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading && !user.user_metadata?.onboarding_completed) {
      navigate("/onboarding");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!user) return <Landing />;
  return <Feed />;
}
