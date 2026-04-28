import { useEffect, useMemo, useState, Suspense } from "react";
import {
  Link,
  useLoaderData,
  useParams,
  useRouteError,
  isRouteErrorResponse,
  type MetaFunction,
} from "react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Camera,
  BookOpen,
  Map,
  Plus,
  Star,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClientOnly } from "@/components/common/ClientOnly";
import { BuildingHero } from "@/features/buildings/components/BuildingHero";
import { DiscoveryBuildingCard } from "@/features/search/components/DiscoveryBuildingCard";
import { getBuildingImageUrl } from "@/utils/image";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { cn } from "@/lib/utils";
import type { DiscoveryBuilding } from "@/features/search/components/types";
import {
  getLocalityBuildingsClient,
  getLocalityMapBuildings,
  LOCALITY_BUILDINGS_PAGE_SIZE,
} from "@/features/localities/api/localitiesApi";
import type { LocalityBuildingDTO } from "@/features/localities/types";
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

// ---------------------------------------------------------------------------
// Lazy map import
// ---------------------------------------------------------------------------
import { lazyWithRetry } from "@/utils/lazyWithRetry";

const CollectionMapGL = lazyWithRetry(
  () =>
    import("@/features/maps/components/CollectionMapGL").then((m) => ({
      default: m.CollectionMapGL,
    })),
);

// ---------------------------------------------------------------------------
// Types for new sections
// NOTE: These extend LocalityPageLoaderData — add fields to the loader as needed.
// ---------------------------------------------------------------------------

interface LocalitySteward {
  userId: string;
  username: string;
  avatarUrl: string | null;
  buildingsLogged: number;
  photosUploaded: number;
  reviewsWritten: number;
  isAmbassador?: boolean;
  /** Ambassador display label, set manually via admin */
  ambassadorTitle?: string;
}

interface LocalityEvent {
  id: string;
  name: string;
  slug: string;
  startDate: string; // ISO
  locationLabel: string | null;
  isFree: boolean;
  tag: string | null;
}

interface LocalityCollection {
  id: string;
  slug: string;
  name: string;
  ownerUsername: string;
  buildingCount: number;
  previewImageUrls: (string | null)[];
  contributorAvatarUrls: (string | null)[];
}

interface LocalityStats {
  buildingsCount: number;
  collectionsCount: number;
  contributorsCount: number;
  photosCount: number;
}

// ---------------------------------------------------------------------------
// Shared section label — editorial micro‑heading
// pattern used throughout BuildingDetails.
// ---------------------------------------------------------------------------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// LocalityHero — photography-first hero with overlay title, or typographic fall‑back
// ---------------------------------------------------------------------------
function LocalityHero({
  city,
  country,
  countryCode,
  region,
  heroImageUrl,
  heroCreditUsername,
  heroSourceBuilding,
}: {
  city: string;
  country: string;
  countryCode: string;
  region: string | null;
  heroImageUrl: string | null;
  heroCreditUsername?: string | null;
  heroSourceBuilding?: string | null;
}) {
  const absoluteUrl = getBuildingImageUrl(heroImageUrl) ?? null;
  const cc = countryCode.toLowerCase();

  const eyebrow = (
    <Link
      to={`/architecture/${cc}`}
      className="inline-flex w-fit text-2xs font-medium uppercase tracking-widest text-text-inverse/75 transition-colors hover:text-text-inverse"
    >
      {country}
    </Link>
  );

  const eyebrowMuted = (
    <Link
      to={`/architecture/${cc}`}
      className="inline-flex w-fit text-2xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
    >
      {country}
    </Link>
  );

  if (absoluteUrl) {
    return (
      <BuildingHero src={absoluteUrl} alt={`${city}, ${country}`}>
        <div className="flex w-full max-w-4xl flex-col gap-6">
          <div className="space-y-3">
            {eyebrow}
            {region ? (
              <p className="text-2xs-plus font-medium uppercase tracking-widest text-text-inverse/60">
                {region}
              </p>
            ) : null}
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-text-inverse md:text-5xl lg:text-6xl">
              {city}
            </h1>
          </div>
          {heroCreditUsername ? (
            <div className="flex items-center justify-end gap-1.5 text-2xs text-text-inverse/70">
              <Camera className="h-3 w-3 shrink-0" aria-hidden />
              <span>
                {heroSourceBuilding ? (
                  <>
                    {heroSourceBuilding} · @{heroCreditUsername}
                  </>
                ) : (
                  <>@{heroCreditUsername}</>
                )}
              </span>
            </div>
          ) : null}
        </div>
      </BuildingHero>
    );
  }

  return (
    <header className="border-b border-border-default bg-surface-default">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-3">
          {eyebrowMuted}
          {region ? (
            <p className="text-2xs-plus font-medium uppercase tracking-widest text-text-disabled">
              {region}
            </p>
          ) : null}
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-text-primary md:text-5xl lg:text-6xl">
            {city}
          </h1>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// LocalityStats — four-up stat strip
// ---------------------------------------------------------------------------
function LocalityStats({ stats }: { stats: LocalityStats }) {
  const items = [
    {
      icon: Building2,
      value: stats.buildingsCount.toLocaleString(),
      label: stats.buildingsCount === 1 ? "Building" : "Buildings",
    },
    {
      icon: BookOpen,
      value: stats.collectionsCount.toLocaleString(),
      label: stats.collectionsCount === 1 ? "Collection" : "Collections",
    },
    {
      icon: Users,
      value: stats.contributorsCount.toLocaleString(),
      label: stats.contributorsCount === 1 ? "Contributor" : "Contributors",
    },
    {
      icon: Camera,
      value: stats.photosCount.toLocaleString(),
      label: stats.photosCount === 1 ? "Photo" : "Photos",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-border-default py-10 sm:grid-cols-4 sm:gap-x-4">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-2">
          <span className="font-display text-3xl font-semibold tabular-nums tracking-tight text-text-primary md:text-4xl">
            {item.value}
          </span>
          <span className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-widest text-text-secondary">
            <item.icon className="h-3 w-3 shrink-0" aria-hidden />
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuickActions — primary CTAs
// ---------------------------------------------------------------------------
function QuickActions({
  city,
  citySlug,
  countryCode,
}: {
  city: string;
  citySlug: string;
  countryCode: string;
}) {
  const actions = [
    {
      to: `/map?locality=${citySlug}&cc=${countryCode}`,
      icon: Map,
      label: "Explore map",
      emphasize: true,
    },
    {
      to: `/collections/new?locality=${citySlug}`,
      icon: BookOpen,
      label: "Create itinerary",
      emphasize: false,
    },
    {
      to: `/buildings/new?city=${encodeURIComponent(city)}`,
      icon: Plus,
      label: "Add a building",
      emphasize: false,
    },
  ] as const;

  return (
    <nav
      aria-label="City actions"
      className="grid gap-0 border-b border-border-default sm:grid-cols-3"
    >
      {actions.map(({ to, icon: Icon, label, emphasize }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            "group flex items-center justify-between gap-3 border-t border-border-default px-1 py-5 transition-colors first:border-t-0 sm:border-t-0 sm:border-l sm:px-5 sm:py-6 sm:first:border-l-0",
            emphasize
              ? "text-text-primary"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                emphasize
                  ? "text-text-primary group-hover:text-text-secondary"
                  : "text-text-secondary group-hover:text-text-primary",
              )}
              aria-hidden
            />
            <span className="text-xs font-medium uppercase tracking-widest transition-colors group-hover:text-text-secondary">
              {label}
            </span>
          </span>
          <span className="shrink-0 text-xs text-text-primary" aria-hidden>
            →
          </span>
        </Link>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// LocalityMap with Smart Filters
// ---------------------------------------------------------------------------

const STYLE_FILTERS = [
  { label: "Brutalist", value: "Brutalism" },
  { label: "Modernist", value: "Modernism" },
  { label: "Art Deco", value: "Art Deco" },
  { label: "Gothic", value: "Gothic" },
  { label: "High-Tech", value: "High-Tech" },
] as const;

const ACCESS_FILTERS = [
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
] as const;

const STATUS_FILTERS = [
  { label: "Existing", value: "Built" },
  { label: "Under construction", value: "Under Construction" },
  { label: "Demolished", value: "Lost" },
] as const;

type StyleFilter = (typeof STYLE_FILTERS)[number]["value"] | null;
type AccessFilter = (typeof ACCESS_FILTERS)[number]["value"] | null;
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"] | null;

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-2.5 py-1 text-2xs font-medium uppercase tracking-widest transition-colors",
        active
          ? "border-text-primary bg-text-primary text-text-inverse"
          : "border-border-default text-text-secondary hover:border-text-primary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function LocalityMap({ localityId }: { localityId: string }) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [styleFilter, setStyleFilter] = useState<StyleFilter>(null);
  const [accessFilter, setAccessFilter] = useState<AccessFilter>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);

  const { data: mapBuildings = [] } = useQuery({
    queryKey: ["localities", localityId, "map-buildings"],
    queryFn: () => getLocalityMapBuildings(localityId),
    staleTime: 300_000,
  });

  type LocalityMapBuildingRow = LocalityBuildingDTO & { access_level?: string | null };

  const filteredBuildings = useMemo(() => {
    return mapBuildings.filter((raw) => {
      const b = raw as LocalityMapBuildingRow;
      if (styleFilter && !b.styles?.some((s) => s.name === styleFilter)) return false;
      if (accessFilter && b.access_level !== accessFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      return true;
    });
  }, [mapBuildings, styleFilter, accessFilter, statusFilter]);

  if (mapBuildings.length === 0) return null;

  const hasActiveFilter = styleFilter || accessFilter || statusFilter;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-6 flex items-center justify-between gap-2">
        <SectionLabel>Map</SectionLabel>
        {hasActiveFilter ? (
          <button
            type="button"
            onClick={() => {
              setStyleFilter(null);
              setAccessFilter(null);
              setStatusFilter(null);
            }}
            className="text-2xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Smart Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {STYLE_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={styleFilter === f.value}
              onClick={() =>
                setStyleFilter(styleFilter === f.value ? null : f.value)
              }
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ACCESS_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={accessFilter === f.value}
              onClick={() =>
                setAccessFilter(accessFilter === f.value ? null : f.value)
              }
            >
              {f.label}
            </FilterChip>
          ))}
          {STATUS_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={statusFilter === f.value}
              onClick={() =>
                setStatusFilter(statusFilter === f.value ? null : f.value)
              }
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="h-[min(520px,65vh)] overflow-hidden border border-border-default bg-surface-muted">
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
              buildings={filteredBuildings as unknown as DiscoveryBuilding[]}
              highlightedId={highlightedId}
              setHighlightedId={setHighlightedId}
            />
          </Suspense>
        </ClientOnly>
      </div>

      {hasActiveFilter ? (
        <p className="mt-2 text-[10px] text-text-disabled">
          Showing {filteredBuildings.length.toLocaleString()} of{" "}
          {mapBuildings.length.toLocaleString()} buildings
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// LocalityStewards — ambassador + top contributors
// ---------------------------------------------------------------------------
function StewardCard({
  steward,
  rank,
}: {
  steward: LocalitySteward;
  rank: number;
}) {
  const initials = steward.username.slice(0, 2).toUpperCase();

  const stats = [
    steward.buildingsLogged > 0
      ? `${steward.buildingsLogged} buildings`
      : null,
    steward.photosUploaded > 0 ? `${steward.photosUploaded} photos` : null,
    steward.reviewsWritten > 0 ? `${steward.reviewsWritten} reviews` : null,
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");

  return (
    <Link
      to={`/profile/${steward.username}`}
      className="group flex items-center gap-3 border-b border-border-default py-3 last:border-b-0"
    >
      <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-text-disabled">
        {rank}
      </span>
      <Avatar className="h-8 w-8 shrink-0 border border-border-default bg-surface-muted">
        <AvatarImage src={steward.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-xs font-medium text-text-secondary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-text-primary transition-colors group-hover:text-brand-primary">
            {steward.username}
          </span>
          {steward.isAmbassador ? (
            <span className="inline-flex items-center gap-1 border border-text-primary/30 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-text-secondary">
              <Star className="h-2.5 w-2.5" aria-hidden />
              {steward.ambassadorTitle ?? "Ambassador"}
            </span>
          ) : null}
        </div>
        {stats ? (
          <p className="mt-0.5 text-[11px] text-text-disabled">{stats}</p>
        ) : null}
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-disabled opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </Link>
  );
}

function LocalityStewards({ stewards }: { stewards: LocalitySteward[] }) {
  if (stewards.length === 0) return null;

  // Ambassador always first, then by contribution volume
  const sorted = [...stewards].sort((a, b) => {
    if (a.isAmbassador && !b.isAmbassador) return -1;
    if (!a.isAmbassador && b.isAmbassador) return 1;
    return b.buildingsLogged - a.buildingsLogged;
  });

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-2 flex items-center justify-between gap-2">
        <SectionLabel>Local experts &amp; stewards</SectionLabel>
      </div>
      <p className="mb-4 text-[11px] text-text-disabled">
        Community members who contribute most to this city on Plano.
      </p>
      <div>
        {sorted.map((s, i) => (
          <StewardCard key={s.userId} steward={s} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// LocalityEvents
// ---------------------------------------------------------------------------
function LocalityEvents({
  events,
  citySlug,
  countryCode,
}: {
  events: LocalityEvent[];
  citySlug: string;
  countryCode: string;
}) {
  if (events.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-6 flex items-center justify-between gap-2">
        <SectionLabel>Events</SectionLabel>
        <Link
          to={`/events/${countryCode.toLowerCase()}/${citySlug}`}
          className="text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
        >
          All events →
        </Link>
      </div>

      <div className="space-y-0">
        {events.map((event) => {
          const date = new Date(event.startDate);
          const month = date
            .toLocaleString("en", { month: "short" })
            .toUpperCase();
          const day = date.getDate();

          return (
            <Link
              key={event.id}
              to={`/events/${countryCode.toLowerCase()}/${citySlug}/${event.slug}`}
              className="group flex items-start gap-4 border-b border-border-default py-4 first:border-t first:border-border-default"
            >
              {/* Date block */}
              <div className="w-10 shrink-0 text-center">
                <span className="block text-[9px] font-medium uppercase tracking-widest text-text-disabled">
                  {month}
                </span>
                <span className="block text-xl font-bold leading-none tracking-tight text-text-primary">
                  {day}
                </span>
              </div>

              {/* Event info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary transition-colors group-hover:text-brand-primary">
                  {event.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {event.locationLabel ? (
                    <span className="text-[11px] text-text-disabled">
                      {event.locationLabel}
                    </span>
                  ) : null}
                  {event.tag ? (
                    <span className="border border-border-default px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-text-disabled">
                      {event.tag}
                    </span>
                  ) : null}
                  {event.isFree ? (
                    <span className="border border-border-default px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-text-disabled">
                      Free
                    </span>
                  ) : null}
                </div>
              </div>

              <CalendarDays className="mt-1 h-3.5 w-3.5 shrink-0 text-text-disabled opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// LocalityCityGuides — curated collections with majority of pins in this city
// ---------------------------------------------------------------------------
function CollectionPreviewMosaic({
  urls,
  name,
}: {
  urls: (string | null)[];
  name: string;
}) {
  const [main, second, third] = urls;

  if (!main) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface-muted text-[10px] uppercase tracking-widest text-text-disabled">
        No images
      </div>
    );
  }

  return (
    <div className="grid aspect-[4/3] w-full grid-cols-[2fr_1fr] gap-0.5 overflow-hidden bg-surface-muted">
      <div className="overflow-hidden">
        <img
          src={getBuildingImageUrl(main) ?? ""}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="grid grid-rows-2 gap-0.5">
        {second ? (
          <div className="overflow-hidden">
            <img
              src={getBuildingImageUrl(second) ?? ""}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="bg-surface-muted" />
        )}
        {third ? (
          <div className="overflow-hidden">
            <img
              src={getBuildingImageUrl(third) ?? ""}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="bg-surface-muted" />
        )}
      </div>
    </div>
  );
}

function LocalityCityGuides({
  collections,
}: {
  collections: LocalityCollection[];
}) {
  if (collections.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-6 flex items-center justify-between gap-2">
        <SectionLabel>City guides</SectionLabel>
        <Link
          to={`/explore`}
          className="text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
        >
          Browse collections →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
        {collections.map((col) => (
          <Link
            key={col.id}
            to={`/${col.ownerUsername}/collections/${col.slug}`}
            className="group block"
          >
            <div className="overflow-hidden">
              <CollectionPreviewMosaic
                urls={col.previewImageUrls}
                name={col.name}
              />
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium leading-snug text-text-primary transition-colors group-hover:text-brand-primary">
                {col.name}
              </p>
              <p className="text-[11px] text-text-disabled">
                {col.buildingCount} buildings
                {col.ownerUsername ? ` · ${col.ownerUsername}` : ""}
              </p>
              {/* Contributor facepile */}
              {col.contributorAvatarUrls.length > 0 ? (
                <div className="flex -space-x-1 pt-1">
                  {col.contributorAvatarUrls.slice(0, 4).map((url, i) => (
                    <Avatar
                      key={i}
                      className="h-5 w-5 border border-surface-card bg-surface-muted"
                    >
                      <AvatarImage src={getBuildingImageUrl(url) ?? undefined} alt="" />
                      <AvatarFallback className="text-[8px]">·</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// LocalityActivityStream — localized discovery feed
// ---------------------------------------------------------------------------

interface ActivityItem {
  id: string;
  type: "review" | "photo" | "building_added" | "collection_created";
  username: string;
  avatarUrl: string | null;
  buildingName: string | null;
  buildingUrl: string | null;
  collectionName: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

/** Loader may gain these fields incrementally; optional until the loader implements them. */
type LocalityPageLoaderResolved = LocalityPageLoaderData & {
  collectionsCount?: number;
  contributorsCount?: number;
  photosCount?: number;
  stewards?: LocalitySteward[];
  events?: LocalityEvent[];
  cityGuideCollections?: LocalityCollection[];
  recentActivity?: ActivityItem[];
  heroCreditUsername?: string | null;
  heroSourceBuilding?: string | null;
  citySlug?: string;
  countryCode?: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const initials = item.username.slice(0, 2).toUpperCase();

  const label = (() => {
    switch (item.type) {
      case "review":
        return (
          <>
            reviewed{" "}
            {item.buildingUrl ? (
              <Link
                to={item.buildingUrl}
                className="font-medium text-text-primary underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {item.buildingName}
              </Link>
            ) : (
              <span className="font-medium text-text-primary">
                {item.buildingName}
              </span>
            )}
          </>
        );
      case "photo":
        return (
          <>
            added photos to{" "}
            {item.buildingUrl ? (
              <Link
                to={item.buildingUrl}
                className="font-medium text-text-primary underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {item.buildingName}
              </Link>
            ) : (
              <span className="font-medium text-text-primary">
                {item.buildingName}
              </span>
            )}
          </>
        );
      case "building_added":
        return (
          <>
            added{" "}
            {item.buildingUrl ? (
              <Link
                to={item.buildingUrl}
                className="font-medium text-text-primary underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {item.buildingName}
              </Link>
            ) : (
              <span className="font-medium text-text-primary">
                {item.buildingName}
              </span>
            )}{" "}
            to the catalogue
          </>
        );
      case "collection_created":
        return (
          <>
            created{" "}
            <span className="font-medium text-text-primary">
              &ldquo;{item.collectionName}&rdquo;
            </span>
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="flex items-start gap-3 border-b border-border-default py-3.5 last:border-b-0">
      <Link to={`/profile/${item.username}`} className="shrink-0">
        <Avatar className="h-7 w-7 border border-border-default bg-surface-muted">
          <AvatarImage src={item.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="text-[10px] font-medium text-text-secondary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-text-secondary">
          <Link
            to={`/profile/${item.username}`}
            className="font-medium text-text-primary transition-colors hover:text-brand-primary"
          >
            {item.username}
          </Link>{" "}
          {label}
        </p>
        <p className="mt-0.5 text-[10px] text-text-disabled">
          {timeAgo(item.createdAt)}
        </p>
      </div>
      {item.thumbnailUrl ? (
        <div className="h-10 w-10 shrink-0 overflow-hidden bg-surface-muted">
          <img
            src={getBuildingImageUrl(item.thumbnailUrl) ?? ""}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}

function LocalityActivityStream({
  items,
  citySlug,
  countryCode,
}: {
  items: ActivityItem[];
  citySlug: string;
  countryCode: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-6 flex items-center justify-between gap-2">
        <SectionLabel>Recent activity</SectionLabel>
        <Link
          to={`/explore?cc=${countryCode}&city=${citySlug}`}
          className="text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
        >
          View all →
        </Link>
      </div>
      <div>
        {items.map((item) => (
          <ActivityItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// LocalityBuildingsGrid — existing, unchanged
// ---------------------------------------------------------------------------
function BuildingCardSkeleton() {
  return <Skeleton className="h-24 w-full" />;
}

function LocalityBuildingsGrid({
  localityId,
  initialBuildings,
}: {
  localityId: string;
  initialBuildings: LocalityPageLoaderData["initialBuildings"];
}) {
  const { containerRef: loadMoreRef, isVisible: loadMoreVisible } =
    useIntersectionObserver({ rootMargin: "200px" });

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

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p) ?? [],
    [query.data],
  );

  useEffect(() => {
    if (!loadMoreVisible) return;
    if (query.hasNextPage && !query.isFetchingNextPage && !query.isError) {
      void query.fetchNextPage();
    }
  }, [
    loadMoreVisible,
    query.hasNextPage,
    query.isFetchingNextPage,
    query.isError,
    query.fetchNextPage,
  ]);

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
          className="mb-6 flex h-24 w-24 items-center justify-center border border-border-default bg-surface-muted text-text-secondary"
          aria-hidden
        >
          <Building2 className="h-12 w-12" />
        </div>
        <p className="max-w-sm text-text-secondary">
          No buildings yet for this city.
        </p>
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
// Page
// ---------------------------------------------------------------------------
export default function LocalityPage() {
  const loaderData = useLoaderData() as LocalityPageLoaderResolved;
  const { locality, initialBuildings } = loaderData;

  // ---------------------------------------------------------------------------
  // New section data — sourced from loader extensions.
  // These fields are typed as optional so the page degrades gracefully while
  // the loader is being extended. Each section checks for presence before render.
  // ---------------------------------------------------------------------------
  const stats: LocalityStats = {
    buildingsCount: locality.buildings_count,
    collectionsCount: loaderData.collectionsCount ?? 0,
    contributorsCount: loaderData.contributorsCount ?? 0,
    photosCount: loaderData.photosCount ?? 0,
  };

  const stewards: LocalitySteward[] = loaderData.stewards ?? [];
  const events: LocalityEvent[] = loaderData.events ?? [];
  const collections: LocalityCollection[] = loaderData.cityGuideCollections ?? [];
  const activityItems: ActivityItem[] = loaderData.recentActivity ?? [];

  const heroCreditUsername: string | null = loaderData.heroCreditUsername ?? null;
  const heroSourceBuilding: string | null = loaderData.heroSourceBuilding ?? null;

  const citySlug: string =
    loaderData.citySlug ?? locality.city.toLowerCase().replace(/\s+/g, "-");
  const countryCode: string = loaderData.countryCode ?? "";

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

        {/* ── Quick Actions ── */}
        <QuickActions
          city={locality.city}
          citySlug={citySlug}
          countryCode={countryCode}
        />

        {/* ── Description ── */}
        {locality.description ? (
          <p className="mt-12 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl md:leading-relaxed">
            {locality.description}
          </p>
        ) : null}

        {/* ── Map with smart filters ── */}
        <LocalityMap localityId={locality.id} />

        {/* ── Buildings ── */}
        <section className="mt-16 border-t border-border-default pt-12">
          <div className="mb-8">
            <SectionLabel>Buildings</SectionLabel>
          </div>
          <LocalityBuildingsGrid
            localityId={locality.id}
            initialBuildings={initialBuildings}
          />
        </section>

        {/* ── City Guides ── */}
        <LocalityCityGuides collections={collections} />

        {/* ── Events ── */}
        <LocalityEvents
          events={events}
          citySlug={citySlug}
          countryCode={countryCode}
        />

        {/* ── Local Experts & Stewards ── */}
        <LocalityStewards stewards={stewards} />

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