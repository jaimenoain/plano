import { Suspense, useState } from "react";
import {
  Link,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  type MetaFunction,
} from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/common/ClientOnly";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { findContinent } from "@/features/guides";
import { CountryHero } from "../components/country/CountryHero";
import { CountryStats } from "../components/country/CountryStats";
import { CountryActions } from "../components/country/CountryActions";
import { CountryEssentials } from "../components/country/CountryEssentials";
import { CountryCities } from "../components/country/CountryCities";
import { CountryEras } from "../components/country/CountryEras";
import { CountryPractices } from "../components/country/CountryPractices";
import { CountryContributors } from "../components/country/CountryContributors";
import { LocalityCityGuides } from "../components/LocalityCityGuides";
import { SectionLabel } from "../components/SectionLabel";
import { buildCountryLead } from "../utils/countryLead";
import { buildCountryMapUrl, geolocatedCities } from "../utils/countryMapUrl";
import { countryPageLoader, type CountryPageLoaderData } from "./CountryPage.loader";
import type { CountryCity } from "../api/countryGuideApi";
import type { DiscoveryBuilding } from "@/features/search/components/types";

export { countryPageLoader as loader } from "./CountryPage.loader";

export const meta: MetaFunction<typeof countryPageLoader> = ({ loaderData: data }) => {
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
      <Skeleton className="h-[clamp(300px,55vh,650px)] w-full" />
      <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">
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
const CollectionMapGL = lazyWithRetry(() =>
  import("@/features/maps/components/CollectionMapGL").then((m) => ({
    default: m.CollectionMapGL,
  })),
);

/** One pin per city, so the shape of the whole country reads at a glance. */
function CountryMap({ cities }: { cities: CountryCity[] }) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const mapPoints = geolocatedCities(cities).map((c) => ({
    id: c.city_slug,
    name: c.city,
    location_lat: c.lat as number,
    location_lng: c.lng as number,
  }));

  if (mapPoints.length === 0) return null;

  const mapFallback = (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
      <Skeleton className="h-full w-full" />
    </div>
  );

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <SectionLabel>On the map</SectionLabel>
      <p className="mt-2 max-w-xl text-sm text-text-secondary">
        {`${mapPoints.length.toLocaleString("en")} located ${
          mapPoints.length === 1 ? "city" : "cities"
        }.`}
      </p>
      <div className="mt-6 h-[360px] overflow-hidden rounded-sm border border-border-default md:h-[480px]">
        <ClientOnly fallback={mapFallback}>
          <Suspense fallback={mapFallback}>
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
  const { guide, countryName, countryCode, totalBuildings } =
    useLoaderData() as CountryPageLoaderData;

  const { country, cities, essentials, eras, practices, contributors, collections } = guide;

  // The hero band borrows the best-photographed essential; "Start here" then
  // skips it rather than showing the same photo twice on one screen.
  const lead = essentials.find((b) => b.image_url) ?? null;

  const leadParagraph = buildCountryLead({ country, cities, eras }).join(" ");

  return (
    <AppLayout showBack>
      <CountryHero
        countryName={countryName}
        countryCode={countryCode}
        continent={findContinent(countryCode)}
        lead={lead}
      />

      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="mt-8">
          <CountryStats country={country} />
        </div>

        {/* Editorial lead — derived from the catalogue, not authored per country. */}
        {leadParagraph ? (
          <p className="mt-10 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl md:leading-relaxed">
            {leadParagraph}
          </p>
        ) : null}

        <CountryActions
          countryName={countryName}
          exploreMapHref={buildCountryMapUrl(countryName, cities)}
        />

        <CountryEssentials
          buildings={essentials}
          countryCode={countryCode}
          totalCount={totalBuildings}
          heroBuildingId={lead?.id ?? null}
        />

        <CountryCities cities={cities} countryCode={countryCode} />

        <CountryEras eras={eras} country={country} />

        <CountryPractices practices={practices} country={country} />

        <LocalityCityGuides
          title="Collections to follow"
          description={`Community-curated routes with pins in ${countryName}.`}
          collections={collections.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            ownerUsername: c.owner_username,
            buildingCount: c.building_count,
            previewImageUrls: c.preview_image_urls,
            contributorAvatarUrls: c.owner_avatar_url ? [c.owner_avatar_url] : [],
          }))}
        />

        <CountryContributors contributors={contributors} countryName={countryName} />

        <CountryMap cities={cities} />

        <div className="mt-16 flex items-center justify-between border-t border-border-default pb-12 pt-10">
          <Link
            to="/guides"
            className="group inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
          >
            <span className="transition-transform group-hover:-translate-x-0.5" aria-hidden>
              ←
            </span>
            Back to guides
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
