import {
  Link,
  useLoaderData,
  useParams,
  useRouteError,
  isRouteErrorResponse,
  type MetaFunction,
} from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LocalityHero } from "../components/LocalityHero";
import { LocalityStats, type LocalityStatsData } from "../components/LocalityStats";
import { QuickActions } from "../components/QuickActions";
import { LocalityMap } from "../components/LocalityMap";
import { LocalityStewards, type LocalitySteward } from "../components/LocalityStewards";
import { LocalityEvents, type LocalityEvent } from "../components/LocalityEvents";
import { LocalityCityGuides, type LocalityCollection } from "../components/LocalityCityGuides";
import { LocalityTopBuildings } from "../components/LocalityTopBuildings";
import {
  LocalityActivityStream,
  type ActivityItem,
} from "../components/LocalityActivityStream";
import { LocalityVolunteerTeam } from "../components/LocalityVolunteerTeam";
import type { LocalityVolunteerTeamMember } from "../api/localitiesApi";
import { localityPageLoader, type LocalityPageLoaderData } from "./LocalityPage.loader";

export { localityPageLoader as loader } from "./LocalityPage.loader";

export const meta: MetaFunction<typeof localityPageLoader> = ({ loaderData: data }) => {
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
  const { cc, city } = useParams();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <AppLayout showBack>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">
            City not found
          </h1>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
            We couldn&apos;t find a city page
            {city ? (
              <>
                {" "}
                <span className="font-mono text-text-primary">
                  ({city}
                  {cc ? `, ${cc.toUpperCase()}` : ""})
                </span>
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

/** Extends LocalityPageLoaderData with optional fields not yet in the loader. */
type LocalityPageLoaderResolved = LocalityPageLoaderData & {
  photosCount?: number;
  events?: LocalityEvent[];
  recentActivity?: ActivityItem[];
  heroCreditUsername?: string | null;
  heroSourceBuilding?: string | null;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LocalityPage() {
  const loaderData = useLoaderData() as LocalityPageLoaderResolved;
  const { locality, initialBuildings } = loaderData;

  const stats: LocalityStatsData = {
    buildingsCount: locality.buildings_count,
    collectionsCount: loaderData.collectionsCount,
    contributorsCount: loaderData.contributorsCount,
    photosCount: loaderData.photosCount ?? 0,
  };

  // Map snake_case API types to the page's camelCase interfaces
  const stewards: LocalitySteward[] = loaderData.stewards.map((s) => ({
    userId: s.user_id,
    username: s.username,
    avatarUrl: s.avatar_url,
    buildingsLogged: s.buildings_logged,
    photosUploaded: s.photos_uploaded,
    reviewsWritten: s.reviews_written,
    isAmbassador: s.is_ambassador,
  }));

  const collections: LocalityCollection[] = loaderData.cityGuideCollections.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    ownerUsername: c.owner_username,
    buildingCount: c.building_count,
    previewImageUrls: c.preview_image_urls,
    contributorAvatarUrls: c.owner_avatar_url ? [c.owner_avatar_url] : [],
  }));

  const volunteerTeam: LocalityVolunteerTeamMember[] = loaderData.volunteerTeam;
  const events: LocalityEvent[] = loaderData.events ?? [];
  const activityItems: ActivityItem[] = loaderData.recentActivity ?? [];

  const heroCreditUsername: string | null = loaderData.heroCreditUsername ?? null;
  const heroSourceBuilding: string | null = loaderData.heroSourceBuilding ?? null;

  const citySlug: string = loaderData.citySlug;
  const countryCode: string = loaderData.countryCode;

  return (
    <AppLayout showBack>
      {/* ── Hero — full-bleed ── */}
      <LocalityHero
        city={locality.city}
        country={locality.country}
        countryCode={locality.country_code}
        region={locality.region}
        heroImageUrl={locality.hero_image_url}
        heroCreditUsername={heroCreditUsername}
        heroSourceBuilding={heroSourceBuilding}
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* ── Stats ── */}
        <div className="mt-8">
          <LocalityStats stats={stats} />
        </div>

        {/* ── Description — editorial lead ── */}
        {locality.description ? (
          <p className="mt-10 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl md:leading-relaxed">
            {locality.description}
          </p>
        ) : null}

        {/* ── Quick Actions ── */}
        <QuickActions
          city={locality.city}
          citySlug={citySlug}
          countryCode={countryCode}
        />

        {/* ── Top Buildings — editorial showcase ── */}
        <LocalityTopBuildings
          buildings={initialBuildings.slice(0, 7)}
          totalCount={locality.buildings_count}
          citySlug={citySlug}
          countryCode={countryCode}
        />

        {/* ── City Guides — collections ── */}
        <LocalityCityGuides collections={collections} />

        {/* ── Top Contributors ── */}
        <LocalityStewards stewards={stewards} />

        {/* ── Map — explore deeper ── */}
        <LocalityMap localityId={locality.id} />

        {/* ── Meet the team — discreet ── */}
        <LocalityVolunteerTeam members={volunteerTeam} />

        {/* ── Events ── */}
        <LocalityEvents
          events={events}
          citySlug={citySlug}
          countryCode={countryCode}
        />

        {/* ── Activity Stream ── */}
        <LocalityActivityStream
          items={activityItems}
          citySlug={citySlug}
          countryCode={countryCode}
        />

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
