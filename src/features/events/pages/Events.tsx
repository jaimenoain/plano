import { useEffect, useMemo } from "react";
import { Link, type MetaFunction } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { EventCard, EventCardSkeleton } from "@/features/events/components/EventCard";
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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Upcoming events</h1>
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link to="/events/new">Share an event</Link>
          </Button>
        </div>

        {query.isError ? (
          <p className="mt-8 text-sm text-destructive" role="alert">
            Events could not be loaded. Please try again later.
          </p>
        ) : null}

        <div className="mt-8 space-y-4">
          {showInitialSkeleton ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-border-default bg-surface-muted text-text-secondary"
                aria-hidden
              >
                <CalendarDays className="h-12 w-12" />
              </div>
              <p className="max-w-sm text-text-secondary">No upcoming events yet.</p>
              <Button asChild className="mt-6">
                <Link to="/events/new">Share the first event</Link>
              </Button>
            </div>
          ) : (
            items.map((ev) => <EventCard key={ev.id} event={ev} />)
          )}
        </div>

        {query.isFetchingNextPage ? (
          <div className="mt-4 space-y-4">
            <EventCardSkeleton />
          </div>
        ) : null}

        <div ref={loadMoreRef} className="h-4 w-full" aria-hidden />
      </div>
    </AppLayout>
  );
}
