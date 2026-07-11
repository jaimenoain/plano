import { useEffect, useMemo } from "react";
import { Link, type MetaFunction } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { EventGridCard, EventGridCardSkeleton } from "@/features/events/components/EventGridCard";
import { EventHeroCard, EventHeroCardSkeleton } from "@/features/events/components/EventHeroCard";
import { getUpcomingEvents, UPCOMING_EVENTS_PAGE_SIZE } from "@/features/events/api/eventsApi";
import type { EventCardDTO } from "@/features/events/types";
import { eventKeys } from "@/features/events/queryKeys";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

function eventHasCoverImage(ev: EventCardDTO): boolean {
  return Boolean(ev.coverImageUrl?.trim());
}

function sortEventsForListing(a: EventCardDTO, b: EventCardDTO): number {
  const aCover = eventHasCoverImage(a);
  const bCover = eventHasCoverImage(b);
  if (aCover !== bCover) return aCover ? -1 : 1;
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

export const meta: MetaFunction = () => [
  { title: "Architecture Events — Exhibitions, Tours & Talks | Plano" },
  { name: "description", content: "Discover architecture events worldwide: guided tours, exhibitions, lectures and open houses. Browse upcoming events on Plano." },
  { property: "og:title", content: "Architecture Events | Plano" },
  { property: "og:description", content: "Discover architecture events worldwide: guided tours, exhibitions, lectures and open houses." },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "Architecture Events | Plano" },
  { name: "twitter:description", content: "Discover architecture events worldwide: guided tours, exhibitions, lectures and open houses." },
  { tagName: "link", rel: "canonical", href: "https://plano.app/events" },
];

export default function Events() {
  const { containerRef: loadMoreRef, isVisible: loadMoreVisible } = useIntersectionObserver({
    rootMargin: "200px",
  });

  const query = useInfiniteQuery({
    queryKey: [...eventKeys.lists(), "upcoming"],
    queryFn: async ({ pageParam }) => getUpcomingEvents(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (lastPage.length < UPCOMING_EVENTS_PAGE_SIZE) return undefined;
      return (lastPageParam as number) + 1;
    },
  });

  const items = useMemo(() => {
    const flat = query.data?.pages.flatMap((p) => p) ?? [];
    return [...flat].sort(sortEventsForListing);
  }, [query.data]);

  const { featured, rest } = useMemo(() => {
    const featuredIndex = items.findIndex(eventHasCoverImage);
    if (featuredIndex === -1) return { featured: null, rest: items };
    const featuredEvent = items[featuredIndex];
    return {
      featured: featuredEvent,
      rest: items.filter((_, i) => i !== featuredIndex),
    };
  }, [items]);

  useEffect(() => {
    if (!loadMoreVisible) return;
    if (query.hasNextPage && !query.isFetchingNextPage && !query.isError) {
      void query.fetchNextPage();
    }
  }, [loadMoreVisible, query.hasNextPage, query.isFetchingNextPage, query.isError, query.fetchNextPage]);

  const showInitialSkeleton =
    !query.isError && (query.isPending || (query.isFetching && items.length === 0));

  return (
    <AppLayout title="Events" showBack={false}>
      <div className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6">
        <header className="mb-11 flex flex-col gap-4 border-b border-border-default pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow tracking-widest">Community calendar</p>
            <h1 className="headline mt-2.5">Upcoming events</h1>
          </div>
          <Link to="/events/new" className="cta-link">
            Share an event
          </Link>
        </header>

        {query.isError ? (
          <p className="text-sm text-feedback-destructive" role="alert">
            Events could not be loaded. Please try again later.
          </p>
        ) : null}

        {showInitialSkeleton ? (
          <div className="space-y-16">
            <EventHeroCardSkeleton />
            <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              <EventGridCardSkeleton />
              <EventGridCardSkeleton />
              <EventGridCardSkeleton />
            </div>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            eyebrow="No upcoming events"
            message="Tours, exhibitions, lectures and open houses will appear here."
            action={
              <Link to="/events/new" className="cta-link">
                Share the first event
              </Link>
            }
          />
        ) : (
          <div className="space-y-16">
            {featured ? <EventHeroCard event={featured} /> : null}
            {rest.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((ev) => (
                  <EventGridCard key={ev.id} event={ev} />
                ))}
              </div>
            ) : null}
          </div>
        )}

        {query.isFetchingNextPage ? (
          <div className="mt-14 grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            <EventGridCardSkeleton />
            <EventGridCardSkeleton />
            <EventGridCardSkeleton />
          </div>
        ) : null}

        <div ref={loadMoreRef} className="h-4 w-full" aria-hidden />
      </div>
    </AppLayout>
  );
}
