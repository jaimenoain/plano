import { Suspense, useState } from "react";
import {
  Link,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  type MetaFunction,
} from "react-router";
import { Building2, MapPin } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/common/ClientOnly";
import { getBuildingImageUrl } from "@/utils/image";
import { getLocalityUrl } from "@/utils/url";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { countryPageLoader, type CountryPageLoaderData } from "./CountryPage.loader";
import type { DiscoveryBuilding } from "@/features/search/components/types";

export { countryPageLoader as loader } from "./CountryPage.loader";

export const meta: MetaFunction<typeof countryPageLoader> = ({ data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as CountryPageLoaderData;
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-12 w-2/3 max-w-sm" />
        <Skeleton className="mb-8 h-6 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <AppLayout showBack>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">
            Country not found
          </h1>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
            We couldn&apos;t find any architecture for that country code. The link may be wrong.
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
// Lazy map import
// ---------------------------------------------------------------------------
const CollectionMapGL = lazyWithRetry(
  () =>
    import("@/features/maps/components/CollectionMapGL").then((m) => ({
      default: m.CollectionMapGL,
    })),
);

// ---------------------------------------------------------------------------
// LocalityCard
// ---------------------------------------------------------------------------
function LocalityCard({
  city,
  country,
  countryCode,
  citySlug,
  buildingsCount,
  heroImageUrl,
}: {
  city: string;
  country: string;
  countryCode: string;
  citySlug: string;
  buildingsCount: number;
  heroImageUrl: string | null;
}) {
  const absoluteUrl = getBuildingImageUrl(heroImageUrl) ?? null;
  const href = getLocalityUrl(countryCode, citySlug);

  return (
    <Link
      to={href}
      className="group flex flex-col overflow-hidden rounded-none border border-border-default bg-surface-default transition-colors hover:border-text-primary"
    >
      {absoluteUrl ? (
        <div className="h-36 w-full overflow-hidden bg-surface-muted">
          <img
            src={absoluteUrl}
            alt={`${city}, ${country}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-surface-muted">
          <Building2 className="h-10 w-10 text-text-secondary" aria-hidden />
        </div>
      )}
      <div className="flex flex-col gap-1 p-4">
        <p className="font-semibold text-text-primary">{city}</p>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          <span>{country}</span>
          <Badge variant="secondary" className="ml-auto font-normal">
            <Building2 className="mr-1 h-3 w-3" aria-hidden />
            {buildingsCount.toLocaleString()}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// CountryMap
// ---------------------------------------------------------------------------
function CountryMap({ localities }: { localities: CountryPageLoaderData["localities"] }) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const mapPoints = localities
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({
      id: l.id,
      name: l.city,
      location_lat: l.lat as number,
      location_lng: l.lng as number,
    }));

  if (mapPoints.length === 0) return null;

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
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-surface-muted">
                <Skeleton className="h-full w-full" />
              </div>
            }
          >
            <CollectionMapGL
              buildings={mapPoints as unknown as DiscoveryBuilding[]}
              highlightedId={highlightedId}
              setHighlightedId={setHighlightedId}
            />
          </Suspense>
        </ClientOnly>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CountryPage() {
  const { localities, countryName, countryCode, totalBuildings } =
    useLoaderData() as CountryPageLoaderData;

  return (
    <AppLayout showBack>
      <header className="border-b border-border-default pb-10">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl">
              {countryName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden />
                {countryCode}
              </span>
              <Badge variant="secondary" className="font-normal">
                <Building2 className="mr-1 h-3 w-3" aria-hidden />
                {totalBuildings.toLocaleString()}{" "}
                {totalBuildings === 1 ? "building" : "buildings"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section>
          <h2 className="mb-6 text-xs font-medium uppercase tracking-[0.15em] text-text-secondary">
            Cities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {localities.map((loc) => (
              <LocalityCard
                key={loc.id}
                city={loc.city}
                country={loc.country}
                countryCode={loc.country_code}
                citySlug={loc.city_slug}
                buildingsCount={loc.buildings_count}
                heroImageUrl={loc.hero_image_url}
              />
            ))}
          </div>
        </section>

        <CountryMap localities={localities} />

        <div className="h-12" />
      </div>
    </AppLayout>
  );
}
