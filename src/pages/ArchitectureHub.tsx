import { Link, useLoaderData, useRouteError, isRouteErrorResponse, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { getBuildingImageUrl } from "@/utils/image";
import { getCountryUrl, getLocalityUrl, ARCHITECTURE_PREFIX } from "@/utils/url";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import {
  architectureHubLoader,
  type ArchitectureHubLoaderData,
  type CountryEntry,
  type TopCity,
} from "./ArchitectureHub.loader";

export { architectureHubLoader as loader } from "./ArchitectureHub.loader";

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export const meta: MetaFunction<typeof architectureHubLoader> = ({ loaderData: d }) => {
  if (!d) return [{ title: "Architecture | Plano" }];
  const loaderData = d as ArchitectureHubLoaderData;
  return [
    {
      title:
        "Architecture Around the World — Explore Buildings by Country & City | Plano",
    },
    {
      name: "description",
      content:
        "Discover iconic buildings, modern structures, and hidden architectural gems from every country. Browse Plano's catalogue of architecture by location — from Paris to Tokyo to São Paulo.",
    },
    {
      property: "og:title",
      content: "Architecture Around the World | Plano",
    },
    {
      property: "og:description",
      content:
        "The world's architecture, cataloged. Explore thousands of buildings by country and city.",
    },
    { property: "og:url", content: `${SITE_URL}${ARCHITECTURE_PREFIX}` },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Architecture Around the World | Plano" },
    {
      name: "twitter:description",
      content:
        "Discover architecture by country and city. Reviewed and photographed by the community.",
    },
    {
      tagName: "link",
      rel: "canonical",
      href: `${SITE_URL}${ARCHITECTURE_PREFIX}`,
    },
    { "script:ld+json": loaderData.breadcrumbStructuredData },
    { "script:ld+json": loaderData.itemListStructuredData },
  ];
};

// ---------------------------------------------------------------------------
// HydrateFallback
// ---------------------------------------------------------------------------

export function HydrateFallback() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
        {/* Hero skeleton */}
        <Skeleton className="mb-3 h-4 w-32 rounded-sm" />
        <Skeleton className="mb-6 h-16 w-2/3 rounded-sm" />
        <Skeleton className="mb-2 h-5 w-96 max-w-full rounded-sm" />
        <Skeleton className="mb-10 h-5 w-80 max-w-full rounded-sm" />

        {/* Stats strip skeleton */}
        <div className="grid grid-cols-3 gap-2 border-b border-t border-border-default py-10 sm:gap-4 md:gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="h-9 w-20 animate-pulse rounded-sm bg-surface-muted" />
              <div className="mt-1 h-3 w-24 animate-pulse rounded-sm bg-surface-muted" />
            </div>
          ))}
        </div>

        {/* Country grid skeleton */}
        <div className="mt-12">
          <Skeleton className="mb-6 h-3 w-32 rounded-sm" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-4/3 w-full animate-pulse rounded-none bg-surface-muted" />
                <div className="mt-3 h-4 w-3/4 animate-pulse rounded-sm bg-surface-muted" />
                <div className="mt-1 h-3 w-1/2 animate-pulse rounded-sm bg-surface-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
          <p className="text-sm text-text-secondary">
            Unable to load architecture index. Please try again.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        <p className="text-sm text-text-secondary">
          Unable to load architecture index. Please try again.
        </p>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// CountryCard
// ---------------------------------------------------------------------------

function CountryCard({ country }: { country: CountryEntry }) {
  const { countryCode, countryName, buildingsCount, heroImageUrl } = country;
  const imageUrl = getBuildingImageUrl(heroImageUrl) ?? null;

  return (
    <Link
      to={getCountryUrl(countryCode)}
      aria-label={`Architecture in ${countryName} — ${buildingsCount} buildings`}
      className="group flex flex-col"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Architecture in ${countryName}`}
          className="aspect-4/3 w-full rounded-none object-cover transition-opacity duration-150 group-hover:opacity-90"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-4/3 w-full items-center justify-center rounded-none bg-surface-muted">
          <span className="text-2xs font-medium uppercase tracking-widest text-text-disabled">
            No image yet
          </span>
        </div>
      )}
      <p className="mt-3 text-base font-semibold tracking-tight text-text-primary">
        {countryName}
      </p>
      <p className="font-mono text-xs font-normal text-text-secondary">
        {buildingsCount.toLocaleString()} buildings
      </p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// CityItem
// ---------------------------------------------------------------------------

function CityItem({ city }: { city: TopCity }) {
  const { countryCode, cityName, citySlug, buildingsCount, countryName } = city;

  return (
    <Link
      to={getLocalityUrl(countryCode, citySlug)}
      className="group flex flex-col gap-0.5"
    >
      <span className="text-2xl font-semibold tracking-tight text-text-primary group-hover:text-text-primary">
        {cityName}
      </span>
      <span className="text-xs font-normal uppercase tracking-wide text-text-secondary">
        {countryName}
      </span>
      <span className="font-mono text-xs text-text-disabled">
        {buildingsCount.toLocaleString()} buildings
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ArchitectureHub() {
  const { countries, topCities, totalBuildings, totalCountries } =
    useLoaderData() as ArchitectureHubLoaderData;

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* ── Section 1: Hero ─────────────────────────────────────────── */}
        <section className="py-12 md:py-24">
          <p className="mb-4 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
            Explore by location
          </p>
          <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-text-primary md:text-6xl">
            The World's Architecture
          </h1>
          <p className="mb-8 max-w-xl text-base font-normal leading-relaxed text-text-secondary">
            Thousands of buildings across {totalCountries} countries — catalogued,
            rated, and reviewed by architects and enthusiasts.
          </p>
          <Link
            to="/search"
            className="text-xs font-medium uppercase tracking-[0.15em] text-text-primary transition-colors hover:text-text-secondary"
          >
            → Start exploring
          </Link>
        </section>

        {/* ── Section 2: Stats strip ──────────────────────────────────── */}
        <dl className="grid grid-cols-3 gap-2 border-b border-t border-border-default py-10 sm:gap-4 md:gap-8">
          <div className="min-w-0">
            <dd className="font-mono text-xl font-bold tracking-tight text-text-primary sm:text-3xl md:text-4xl">
              {totalBuildings.toLocaleString()}
            </dd>
            <dt className="mt-1 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
              Buildings
            </dt>
          </div>
          <div className="min-w-0">
            <dd className="font-mono text-xl font-bold tracking-tight text-text-primary sm:text-3xl md:text-4xl">
              {totalCountries}
            </dd>
            <dt className="mt-1 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
              Countries
            </dt>
          </div>
          <div className="min-w-0">
            <dd className="font-mono text-xl font-bold tracking-tight text-text-primary sm:text-3xl md:text-4xl">
              Community
            </dd>
            <dt className="mt-1 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
              Reviewed
            </dt>
          </div>
        </dl>

        {/* ── Section 3: Country grid ─────────────────────────────────── */}
        <section className="mt-16">
          <p className="mb-6 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
            Browse by country
          </p>
          {countries.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {countries.map((country) => (
                <CountryCard key={country.countryCode} country={country} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No countries yet.</p>
          )}
        </section>

        {/* ── Section 4: Featured cities ──────────────────────────────── */}
        {topCities.length > 0 && (
          <>
            <div className="mt-16 border-t border-border-default" />
            <section className="mt-16 pb-24">
              <p className="mb-8 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
                Popular destinations
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3">
                {topCities.map((city) => (
                  <CityItem key={`${city.countryCode}-${city.citySlug}`} city={city} />
                ))}
              </div>
            </section>
          </>
        )}

        {topCities.length === 0 && <div className="h-24" />}
      </div>
    </AppLayout>
  );
}
