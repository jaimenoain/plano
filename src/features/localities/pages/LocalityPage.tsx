import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLoaderData,
  useParams,
  useRouteError,
  isRouteErrorResponse,
  type MetaFunction,
} from "react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Building2, MapPin } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/common/ClientOnly";
import { BuildingHero } from "@/features/buildings/components/BuildingHero";
import { DiscoveryBuildingCard } from "@/features/search/components/DiscoveryBuildingCard";
import { getBuildingImageUrl } from "@/utils/image";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import type { DiscoveryBuilding } from "@/features/search/components/types";
import {
  getLocalityBuildingsClient,
  getLocalityMapBuildings,
  LOCALITY_BUILDINGS_PAGE_SIZE,
} from "@/features/localities/api/localitiesApi";
import { localityPageLoader, type LocalityPageLoaderData } from "./LocalityPage.loader";

export { localityPageLoader as loader } from "./LocalityPage.loader";

export const meta: MetaFunction<typeof localityPageLoader> = ({ data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as LocalityPageLoaderData;
  return [
    { title: d.metaTitle },
    { name: "description", content: d.metaDescription },
    { property: "og:title", content: d.metaTitle },
    { property: "og:description", content: d.metaDescription },
    { property: "og:image", content: d.ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: d.canonical },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: d.metaTitle },
    { name: "twitter:description", content: d.metaDescription },
    { name: "twitter:image", content: d.ogImage },
    { tagName: "link", rel: "canonical", href: d.canonical },
    { "script:ld+json": d.structuredData },
  ];
};

export function HydrateFallback() {
  return (
    <AppLayout showBack title="Loading…">
      <Skeleton className="h-[clamp(260px,48vh,500px)] w-full" />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-12 w-2/3 max-w-sm" />
        <Skeleton className="mb-8 h-6 w-40" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </AppLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { citySlug } = useParams();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <AppLayout showBack>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">
            City not found
          </h1>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
            We couldn&apos;t find a city page
            {citySlug ? (
              <>
                {" "}
                <span className="font-mono text-text-primary">({citySlug})</span>
              </>
            ) : null}
            . The link may be wrong or the page was removed.
          </p>
          <Button asChild size="lg" variant="default" className="min-w-[200px]">
            <Link to="/explore">Browse buildings</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">
          Something went wrong
        </h1>
        <p className="mb-6 max-w-md text-sm text-text-secondary">
          Please try again in a moment.
        </p>
        <Button asChild size="lg" variant="default">
          <Link to="/">Home</Link>
        </Button>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Lazy map import — avoids loading MapLibre GL on the server
// ---------------------------------------------------------------------------
import { lazyWithRetry } from "@/utils/lazyWithRetry";

const CollectionMapGL = lazyWithRetry(
  () =>
    import("@/features/maps/components/CollectionMapGL").then((m) => ({
      default: m.CollectionMapGL,
    })),
);

// ---------------------------------------------------------------------------
// LocalityHero
// ---------------------------------------------------------------------------
function LocalityHero({
  city,
  country,
  buildingsCount,
  heroImageUrl,
}: {
  city: string;
  country: string;
  buildingsCount: number;
  heroImageUrl: string | null;
}) {
  const absoluteUrl = getBuildingImageUrl(heroImageUrl) ?? null;

  return (
    <>
      {absoluteUrl ? (
        <BuildingHero src={absoluteUrl} alt={`${city}, ${country}`} />
      ) : null}
      <header className="border-b border-border-default pb-10">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl">
                {city}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden />
                  {country}
                </span>
                <Badge variant="secondary" className="font-normal">
                  <Building2 className="mr-1 h-3 w-3" aria-hidden />
                  {buildingsCount.toLocaleString()}{" "}
                  {buildingsCount === 1 ? "building" : "buildings"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

// ---------------------------------------------------------------------------
// LocalityBuildingsGrid
// ---------------------------------------------------------------------------
function BuildingCardSkeleton() {
  return <Skeleton className="h-24 w-full" />;
}

function LocalityBuildingsGrid({ localityId, initialBuildings }: {
  localityId: string;
  initialBuildings: LocalityPageLoaderData["initialBuildings"];
}) {
  const { containerRef: loadMoreRef, isVisible: loadMoreVisible } = useIntersectionObserver({
    rootMargin: "200px",
  });

  const query = useInfiniteQuery({
    queryKey: ["localities", localityId, "buildings"],
    queryFn: async ({ pageParam }) =>
      getLocalityBuildingsClient(localityId, pageParam as number),
    initialPageParam: 0,
    initialData: {
      pages: [initialBuildings],
      pageParams: [0],
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (lastPage.length < LOCALITY_BUILDINGS_PAGE_SIZE) return undefined;
      return (lastPageParam as number) + 1;
    },
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p) ?? [], [query.data]);

  useEffect(() => {
    if (!loadMoreVisible) return;
    if (query.hasNextPage && !query.isFetchingNextPage && !query.isError) {
      void query.fetchNextPage();
    }
  }, [loadMoreVisible, query.hasNextPage, query.isFetchingNextPage, query.isError, query.fetchNextPage]);

  if (query.isError) {
    return (
      <p className="mt-4 text-sm text-destructive" role="alert">
        Buildings could not be loaded. Please try again later.
      </p>
    );
  }

  if (items.length === 0 && !query.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-border-default bg-surface-muted text-text-secondary"
          aria-hidden
        >
          <Building2 className="h-12 w-12" />
        </div>
        <p className="max-w-sm text-text-secondary">No buildings yet for this city.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {items.map((b) => (
          <DiscoveryBuildingCard
            key={b.id}
            building={b as unknown as DiscoveryBuilding}
            imagePosition="right"
          />
        ))}
      </div>

      {query.isFetchingNextPage ? (
        <div className="mt-4 space-y-4">
          <BuildingCardSkeleton />
        </div>
      ) : null}

      <div ref={loadMoreRef} className="h-4 w-full" aria-hidden />
    </div>
  );
}

// ---------------------------------------------------------------------------
// LocalityMap
// ---------------------------------------------------------------------------
function LocalityMap({ localityId }: { localityId: string }) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const { data: mapBuildings = [] } = useQuery({
    queryKey: ["localities", localityId, "map-buildings"],
    queryFn: () => getLocalityMapBuildings(localityId),
    staleTime: 300_000,
  });

  if (mapBuildings.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-text-secondary">
        Map
      </h2>
      <div className="h-[480px] overflow-hidden rounded-sm border border-border-default">
        <ClientOnly
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-surface-muted">
              <Skeleton className="h-full w-full" />
            </div>
          }
        >
          <CollectionMapGL
            buildings={mapBuildings as unknown as DiscoveryBuilding[]}
            highlightedId={highlightedId}
            setHighlightedId={setHighlightedId}
          />
        </ClientOnly>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LocalityPage() {
  const loaderData = useLoaderData() as LocalityPageLoaderData;
  const { locality, initialBuildings } = loaderData;

  return (
    <AppLayout showBack>
      <LocalityHero
        city={locality.city}
        country={locality.country}
        buildingsCount={locality.buildings_count}
        heroImageUrl={locality.hero_image_url}
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {locality.description ? (
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-text-secondary">
            {locality.description}
          </p>
        ) : null}

        <section className="mt-10">
          <h2 className="mb-6 text-xs font-medium uppercase tracking-widest text-text-secondary">
            Buildings
          </h2>
          <LocalityBuildingsGrid
            localityId={locality.id}
            initialBuildings={initialBuildings}
          />
        </section>

        <LocalityMap localityId={locality.id} />

        <div className="h-12" />
      </div>
    </AppLayout>
  );
}
