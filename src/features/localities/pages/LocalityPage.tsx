import { useMemo, useState, Suspense } from "react";
import {
  Link,
  useLoaderData,
  useParams,
  useRouteError,
  isRouteErrorResponse,
  type MetaFunction,
} from "react-router";
import { useQuery } from "@tanstack/react-query";
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
import { getBuildingImageUrl } from "@/utils/image";
import { cn } from "@/lib/utils";
import type { DiscoveryBuilding } from "@/features/search/components/types";
import {
  getLocalityMapBuildings,
  type LocalityVolunteerTeamMember,
} from "@/features/localities/api/localitiesApi";
import { getBuildingLocalityUrl } from "@/utils/url";
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
    <h2 className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
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
            <h1 className="text-3xl font-bold leading-[1.05] tracking-tight text-text-inverse md:text-5xl lg:text-6xl">
              {city}
            </h1>
          </div>
          {heroCreditUsername ? (
            <div className="flex items-center justify-end gap-1.5 text-2xs text-text-inverse/70">
              <Camera className="h-3 w-3 shrink-0" aria-hidden />
              <span>
                {heroSourceBuilding ? (
                  <>{heroSourceBuilding} · </>
                ) : null}
                Foto:{" "}
                <Link
                  to={`/profile/${heroCreditUsername}`}
                  className="transition-colors hover:text-text-inverse"
                >
                  {heroCreditUsername}
                </Link>
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
          <h1 className="text-3xl font-bold leading-[1.05] tracking-tight text-text-primary md:text-5xl lg:text-6xl">
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
            "group flex items-center justify-between gap-3 border-t border-border-default px-3 py-5 transition-colors first:border-t-0 sm:border-t-0 sm:border-l sm:px-5 sm:py-6 sm:first:border-l-0",
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
  { label: "Lost", value: "Lost" },
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
        "inline-flex min-h-[44px] items-center justify-center border px-3 py-2 text-2xs font-medium uppercase tracking-widest transition-colors",
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

  // Annotate each building with a popularity-based tier_rank string so
  // CollectionMapGL can apply the same priority pin styling as the search map.
  // mapBuildings is already sorted popularity_score DESC; filteredBuildings
  // preserves that order, so idx=0 is the most popular in the current filter.
  const buildingsForMap = useMemo((): DiscoveryBuilding[] => {
    const total = filteredBuildings.length;
    return filteredBuildings.map((b, idx) => {
      let tier_rank: string;
      if (idx < Math.max(1, Math.ceil(total * 0.01))) tier_rank = 'Top 1%';
      else if (idx < Math.max(2, Math.ceil(total * 0.05))) tier_rank = 'Top 5%';
      else if (idx < Math.ceil(total * 0.20)) tier_rank = 'Top 20%';
      else tier_rank = 'Standard';
      return { ...b, tier_rank } as unknown as DiscoveryBuilding;
    });
  }, [filteredBuildings]);

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
              buildings={buildingsForMap}
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
      ? {
          icon: Building2,
          label: `${steward.buildingsLogged} building${steward.buildingsLogged === 1 ? "" : "s"}`,
        }
      : null,
    steward.photosUploaded > 0
      ? {
          icon: Camera,
          label: `${steward.photosUploaded} photo${steward.photosUploaded === 1 ? "" : "s"}`,
        }
      : null,
    steward.reviewsWritten > 0
      ? {
          icon: BookOpen,
          label: `${steward.reviewsWritten} review${steward.reviewsWritten === 1 ? "" : "s"}`,
        }
      : null,
  ].filter(Boolean) as Array<{ icon: typeof Building2; label: string }>;

  return (
    <Link
      to={`/profile/${steward.username}`}
      className="group flex items-center gap-4 px-1 py-3.5 transition-colors hover:bg-surface-muted/50"
    >
      <span className="w-7 shrink-0 text-[10px] font-medium tabular-nums text-text-disabled transition-colors group-hover:text-text-secondary">
        {String(rank).padStart(2, "0")}
      </span>
      <Avatar className="h-10 w-10 shrink-0 border border-border-default bg-surface-muted">
        <AvatarImage src={steward.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-sm font-medium text-text-secondary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-medium text-text-primary transition-colors group-hover:text-text-secondary">
            {steward.username}
          </span>
          {steward.isAmbassador ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-widest text-text-secondary">
              <Star className="h-2.5 w-2.5 fill-current" aria-hidden />
              {steward.ambassadorTitle ?? "Ambassador"}
            </span>
          ) : null}
        </div>
        {stats.length > 0 ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
            {stats.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 tabular-nums"
              >
                <Icon className="h-3 w-3 text-text-disabled" aria-hidden />
                {label}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 text-text-disabled opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
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
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <SectionLabel>Local experts &amp; stewards</SectionLabel>
        <span className="text-[10px] tabular-nums text-text-disabled">
          {sorted.length}{" "}
          {sorted.length === 1 ? "contributor" : "contributors"}
        </span>
      </div>
      <p className="mb-6 max-w-prose text-xs text-text-secondary">
        Community members who contribute most to this city on Plano.
      </p>
      <ul className="divide-y divide-border-default border-y border-border-default">
        {sorted.map((s, i) => (
          <li key={s.userId}>
            <StewardCard steward={s} rank={i + 1} />
          </li>
        ))}
      </ul>
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
                <p className="text-sm font-medium text-text-primary transition-colors group-hover:text-text-secondary">
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

  const mainSrc = getBuildingImageUrl(main) ?? "";

  return (
    <>
      {/* Mobile: single hero — avoids ~50px thumbnail strip beside a 2fr/1fr grid */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-surface-muted md:hidden">
        <img src={mainSrc} alt={name} className="h-full w-full rounded-none object-cover" />
      </div>

      <div className="hidden aspect-[4/3] w-full grid-cols-[2fr_1fr] gap-[1.5px] overflow-hidden bg-border-default md:grid">
        <div className="overflow-hidden bg-surface-muted">
          <img src={mainSrc} alt={name} className="h-full w-full rounded-none object-cover" />
        </div>
        <div className="grid grid-rows-2 gap-[1.5px]">
          {second ? (
            <div className="overflow-hidden bg-surface-muted">
              <img
                src={getBuildingImageUrl(second) ?? ""}
                alt=""
                className="h-full w-full rounded-none object-cover"
              />
            </div>
          ) : (
            <div className="bg-surface-muted" />
          )}
          {third ? (
            <div className="overflow-hidden bg-surface-muted">
              <img
                src={getBuildingImageUrl(third) ?? ""}
                alt=""
                className="h-full w-full rounded-none object-cover"
              />
            </div>
          ) : (
            <div className="bg-surface-muted" />
          )}
        </div>
      </div>
    </>
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
              <p className="text-sm font-medium leading-snug text-text-primary transition-colors group-hover:text-text-secondary">
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
// LocalityTopBuildings — editorial showcase (replaces the infinite-scroll list)
// ---------------------------------------------------------------------------
function LocalityTopBuildings({
  buildings,
  totalCount,
  citySlug,
  countryCode,
}: {
  buildings: LocalityBuildingDTO[];
  totalCount: number;
  citySlug: string;
  countryCode: string;
}) {
  if (buildings.length === 0) return null;

  const [hero, ...rest] = buildings;
  const secondary = rest.slice(0, 5);

  const heroUrl = getBuildingLocalityUrl(countryCode, citySlug, hero.id, hero.slug, hero.short_id);

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-8 flex items-center justify-between gap-2">
        <SectionLabel>Top buildings</SectionLabel>
        <Link
          to={`/architecture/${countryCode}/${citySlug}`}
          className="text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
        >
          All {totalCount.toLocaleString()} →
        </Link>
      </div>

      {/* Hero building — full-width feature card */}
      <Link to={heroUrl} className="group mb-3 block overflow-hidden border border-border-default">
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-muted">
          {hero.main_image_url ? (
            <>
              <img
                src={getBuildingImageUrl(hero.main_image_url) ?? ""}
                alt={hero.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                {hero.year_completed ? (
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-white/55">
                    {hero.year_completed}
                  </p>
                ) : null}
                <h3 className="text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
                  {hero.name}
                </h3>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col justify-end bg-surface-muted p-5 sm:p-6">
              {hero.year_completed ? (
                <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-text-disabled">
                  {hero.year_completed}
                </p>
              ) : null}
              <h3 className="text-xl font-bold leading-tight tracking-tight text-text-primary sm:text-2xl">
                {hero.name}
              </h3>
            </div>
          )}
        </div>
      </Link>

      {/* Secondary buildings — 2-col mobile, 3-col desktop */}
      {secondary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {secondary.map((b) => {
            const url = getBuildingLocalityUrl(countryCode, citySlug, b.id, b.slug, b.short_id);
            return (
              <Link
                key={b.id}
                to={url}
                className="group block overflow-hidden border border-border-default"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
                  {b.main_image_url ? (
                    <>
                      <img
                        src={getBuildingImageUrl(b.main_image_url) ?? ""}
                        alt={b.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
                      <Building2 className="h-8 w-8 text-text-disabled" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {b.year_completed ? (
                      <p className="text-[9px] font-medium uppercase tracking-widest text-white/55">
                        {b.year_completed}
                      </p>
                    ) : null}
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">
                      {b.name}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
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

/** Extends LocalityPageLoaderData with optional fields not yet in the loader. */
type LocalityPageLoaderResolved = LocalityPageLoaderData & {
  photosCount?: number;
  events?: LocalityEvent[];
  recentActivity?: ActivityItem[];
  heroCreditUsername?: string | null;
  heroSourceBuilding?: string | null;
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
            className="font-medium text-text-primary transition-colors hover:text-text-secondary"
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
// LocalityVolunteerTeam — discreet editorial "meet the team" section
// ---------------------------------------------------------------------------

function LocalityVolunteerTeam({
  members,
}: {
  members: LocalityVolunteerTeamMember[];
}) {
  if (members.length === 0) return null;

  const president = members.filter((m) => m.role === "president");
  const exco = members.filter((m) => m.role === "exco");
  const ambassadors = members.filter((m) => m.role === "ambassador");

  function InlineTeamRow({ label, group }: { label: string; group: LocalityVolunteerTeamMember[] }) {
    if (group.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="w-28 shrink-0 text-[9px] font-medium uppercase tracking-widest text-text-disabled">
          {label}
        </span>
        {group.map((m) => (
          <Link
            key={m.user_id}
            to={`/profile/${m.username}`}
            className="group flex items-center gap-1.5"
          >
            <Avatar className="h-5 w-5 shrink-0 border border-border-default bg-surface-muted">
              <AvatarImage src={m.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-[8px]">
                {m.username.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-text-secondary transition-colors group-hover:text-text-primary">
              {m.username}
            </span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section className="mt-14 border-t border-border-default pt-8">
      <div className="mb-5 flex items-center gap-2">
        <SectionLabel>Meet the team</SectionLabel>
      </div>
      <div className="space-y-3">
        <InlineTeamRow label="President" group={president} />
        <InlineTeamRow label="Executive committee" group={exco} />
        <InlineTeamRow label="Ambassadors" group={ambassadors} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LocalityPage() {
  const loaderData = useLoaderData() as LocalityPageLoaderResolved;
  const { locality, initialBuildings } = loaderData;

  const stats: LocalityStats = {
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