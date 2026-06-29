import { useEffect, useMemo, useRef } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useExploreShell } from "@/components/layout/ExploreShellContext";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { ReviewCardFeed } from "@/features/posts/components/ReviewCardFeed";
import { FeedActivitySummaryRow } from "@/features/posts/components/FeedActivitySummaryRow";
import { EditorialFeedPost } from "@/features/feed/components/EditorialFeedPost";
import { resolveCardType } from "@/features/posts/utils/resolveCardType";
import { groupHomeFeedEntries } from "@/features/feed/utils/groupActivitySummary";
import type { FeedHomeEntry, FeedReview } from "@/types/feed";
import { useHomeFeed } from "@/features/feed/hooks/useHomeFeed";
import { useCommunityFeed } from "@/features/feed/hooks/useCommunityFeed";
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
        <section className="mx-auto max-w-[1080px] px-5 py-[120px] md:px-8">
          <div className="mb-20 space-y-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-disabled">
              What we&apos;re building
            </p>
            <h2 className="max-w-xl text-[clamp(1.875rem,4.2vw,3rem)] font-bold leading-[1.05] tracking-[-0.025em] text-text-primary">
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
    <div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse space-y-4 border-b border-border-default py-[26px] pb-7"
        >
          <div className="h-3 w-48 rounded-none bg-surface-muted" />
          <div className="h-14 w-4/5 max-w-lg rounded-none bg-surface-muted" />
          <div className="h-6 w-3/4 max-w-md rounded-none bg-surface-muted" />
          <div className="aspect-video w-full rounded-none bg-surface-muted" />
          <div className="h-4 w-40 rounded-none bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

function isEventAttendanceEntry(entry: FeedHomeEntry): boolean {
  return "rowType" in entry && entry.rowType === "event_attendance";
}

function isFeedReviewEntry(entry: FeedHomeEntry): entry is FeedReview {
  return !isEventAttendanceEntry(entry);
}

function HomeFeedEntry({
  entry,
  onLike,
  onImageLike,
}: {
  entry: FeedHomeEntry;
  onLike: (reviewId: string) => void;
  onImageLike: (reviewId: string, imageId: string) => void;
}) {
  if (isEventAttendanceEntry(entry)) {
    return <ReviewCardFeed entry={entry} onLike={onLike} onImageLike={onImageLike} />;
  }
  if (!isFeedReviewEntry(entry)) return null;
  if (resolveCardType(entry) === "activity") {
    return <ReviewCardFeed entry={entry} onLike={onLike} onImageLike={onImageLike} />;
  }
  return <EditorialFeedPost entry={entry} onLike={onLike} onImageLike={onImageLike} />;
}

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <header className="mb-8 flex items-baseline justify-between border-b border-text-primary pb-2.5">
      <h2 className="m-0 text-[11px] font-medium uppercase tracking-[0.15em] text-text-primary">
        <span className="mr-2.5 font-mono text-text-disabled">{index}</span>
        {title}
      </h2>
    </header>
  );
}

function FeedErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="space-y-4 border-t border-border-default py-16 text-center"
      role="alert"
    >
      <p className="text-sm text-text-secondary">
        Couldn&apos;t load the feed. Please try again.
      </p>
      <Button
        type="button"
        variant="outline"
        className="rounded-none"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

/** Renders grouped feed entries (activity summaries + cards) for one section. */
function FeedEntries({
  reviews,
  onLike,
  onImageLike,
}: {
  reviews: FeedReview[];
  onLike: (reviewId: string) => void;
  onImageLike: (reviewId: string, imageId: string) => void;
}) {
  const items = useMemo(() => groupHomeFeedEntries(reviews), [reviews]);
  return (
    <>
      {items.map((item) =>
        item.kind === "activity-summary" ? (
          <FeedActivitySummaryRow key={item.key} entries={item.entries} />
        ) : (
          <HomeFeedEntry
            key={item.entry.id}
            entry={item.entry}
            onLike={onLike}
            onImageLike={onImageLike}
          />
        ),
      )}
    </>
  );
}

function Feed() {
  const following = useHomeFeed();
  const community = useCommunityFeed();

  // The community section is the unbounded one, so it drives infinite scroll.
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = community;

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
      <div className="mx-auto flex w-full max-w-[1080px] items-start gap-10 px-5 pb-24 pt-10 md:gap-14 md:px-8">
        <main className="min-w-0 flex-1 border-r border-border-default pr-10 md:pr-14">
          {/* §01 — new, unseen updates from people you follow */}
          <SectionHeader index="§ 01" title="New from people you follow" />
          {following.isLoading ? (
            <FeedSkeleton />
          ) : following.isError ? (
            <FeedErrorBlock onRetry={() => void following.refetch()} />
          ) : following.reviews.length === 0 ? (
            <div className="border-t border-border-default py-12 text-center">
              <p className="text-sm text-text-secondary">
                You&apos;re all caught up — nothing new from people you follow.
              </p>
            </div>
          ) : (
            <FeedEntries
              reviews={following.reviews}
              onLike={following.toggleLike}
              onImageLike={following.toggleImageLike}
            />
          )}

          {/* §02 — discovery from the rest of the community */}
          <div className="mt-16">
            <SectionHeader index="§ 02" title="Discover from the community" />
          </div>
          {community.isLoading ? (
            <FeedSkeleton />
          ) : community.isError ? (
            <FeedErrorBlock onRetry={() => void community.refetch()} />
          ) : community.reviews.length === 0 ? (
            <div className="border-t border-border-default py-12 text-center">
              <p className="text-sm text-text-secondary">
                Nothing to discover right now. Check back soon.
              </p>
            </div>
          ) : (
            <div>
              <FeedEntries
                reviews={community.reviews}
                onLike={community.toggleLike}
                onImageLike={community.toggleImageLike}
              />
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {community.isFetchingNextPage ? (
                  <Loader2
                    className="h-6 w-6 animate-spin text-text-secondary"
                    aria-label="Loading more"
                  />
                ) : community.hasNextPage ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none"
                    onClick={() => void community.fetchNextPage()}
                  >
                    Load more
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </main>

        <aside className="hidden w-[280px] shrink-0 md:block">
          <div className="sticky top-[88px]">
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
