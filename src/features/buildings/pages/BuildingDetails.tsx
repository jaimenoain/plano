import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  useParams,
  Link,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  useRevalidator,
  useSearchParams,
  type MetaFunction,
} from "react-router";
import {
  Loader2, MapPin,
  Check, Bookmark, Image as ImageIcon,
  Heart, ExternalLink, Circle, AlertTriangle,
  EyeOff, Plus, X,
  Pencil, BadgeCheck, ChevronDown, Share2, Navigation,
  FileText, Box, Hammer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { ImageDetailsDialog } from "../components/ImageDetailsDialog";
import {
  buildingCreditsQueryKey,
  getBuildingCredits,
} from "@/features/credits/api/credits";
import {
  leadAttributionFromCredits,
  visiblePrimaryCredits,
} from "@/features/credits/buildingCreditDisplay";
import { getBuildingUrl, getLocalityUrl } from "@/utils/url";
import { CollectionSelector } from "@/features/collections/components/CollectionSelector";
import { BuildingLocationMap } from "@/features/maps/components/BuildingLocationMap";
import { PrimaryCreditsLinks } from "../components/PrimaryCreditsLinks";
import { ArchitectStatement } from "../components/ArchitectStatement";
import { BuildingCredits, BuildingCreditsPreview } from "../components/BuildingCredits";
import { BuildingContributorsInline } from "../components/BuildingContributorsInline";
import { buildingLoader } from "./BuildingDetails.loader";
import {
  buildingCanonicalUrl,
  buildingStructuredData,
  buildingBreadcrumbStructuredData,
  buildingDescription,
  SITE_URL,
} from "@/features/buildings/utils/structuredData";
import { cn } from "@/lib/utils";
import { useBuildingInteractions } from "@/features/buildings/hooks/useBuildingInteractions";
import {
  buildingEntryToFeedReview,
  type BuildingSummaryForFeed,
} from "@/features/buildings/utils/buildingReviewFeedAdapter";
import { ActivityStreamGroup } from "@/features/feed/components/ActivityStream";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClientOnly } from "@/components/common/ClientOnly";
import {
  getRelatedBuildingsByPerson,
  getRelatedBuildingsByCompany,
  getBuildingsByCity,
  type RelatedBuilding,
} from "@/features/buildings/api/related";

export { buildingLoader as loader } from "./BuildingDetails.loader";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = "overview" | "media" | "technical" | "credits";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "media", label: "Media" },
  { id: "technical", label: "Technical" },
  { id: "credits", label: "Credits" },
];

// ─── Related buildings sub-components ────────────────────────────────────────

function RelatedBuildingCard({ b }: { b: RelatedBuilding }) {
  return (
    <Link to={b.buildingUrl} className="flex-shrink-0 w-40 sm:w-48 group">
      <div className="aspect-[4/3] w-full overflow-hidden bg-surface-muted">
        {b.imageUrl ? (
          <img
            src={b.imageUrl}
            alt={b.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-widest text-text-secondary">
            No image
          </div>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="text-sm font-medium leading-snug text-text-primary line-clamp-2 group-hover:underline">
          {b.name}
        </p>
        {(b.city || b.year_completed) ? (
          <p className="text-xs text-text-secondary">
            {[b.city, b.year_completed].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function RelatedBuildingRow({
  title,
  viewAllHref,
  viewAllLabel,
  buildings,
  isLoading,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  buildings: RelatedBuilding[];
  isLoading: boolean;
}) {
  if (!isLoading && buildings.length === 0) return null;

  return (
    <section className="mt-12 border-t border-border-default pt-10">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
          {title}
        </h2>
        <Link
          to={viewAllHref}
          className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
        >
          {viewAllLabel} →
        </Link>
      </div>
      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-40 sm:w-48 space-y-2">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {buildings.map((b) => (
            <RelatedBuildingCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </section>
  );
}

function RelatedByArchitectSection({
  building,
  primaryCredit,
}: {
  building: BuildingDetails;
  primaryCredit: import("@/features/credits/types").BuildingCreditWithEntities | null;
}) {
  const personId = primaryCredit?.personId ?? null;
  const companyId = primaryCredit?.companyId ?? null;
  const architectName = primaryCredit?.person?.name ?? primaryCredit?.company?.name ?? null;
  const architectSlug = primaryCredit?.person?.slug ?? primaryCredit?.company?.slug ?? null;
  const isPersonCredit = !!primaryCredit?.personId;

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ["buildings", "related", "architect", personId ?? companyId],
    queryFn: () =>
      personId
        ? getRelatedBuildingsByPerson(personId, building.id)
        : companyId
          ? getRelatedBuildingsByCompany(companyId, building.id)
          : Promise.resolve([]),
    enabled: !!(personId || companyId),
    staleTime: 120_000,
  });

  if (!architectName || !architectSlug) return null;

  const viewAllHref = isPersonCredit
    ? `/person/${architectSlug}`
    : `/company/${architectSlug}`;

  return (
    <RelatedBuildingRow
      title={`More by ${architectName}`}
      viewAllHref={viewAllHref}
      viewAllLabel="View all works"
      buildings={buildings}
      isLoading={isLoading}
    />
  );
}

function RelatedByCitySection({
  building,
  locality,
}: {
  building: BuildingDetails;
  locality: { country_code: string; city_slug: string } | null;
}) {
  const city = building.city;

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ["buildings", "city", city],
    queryFn: () => getBuildingsByCity(city!, building.id),
    enabled: !!city,
    staleTime: 120_000,
  });

  if (!city) return null;

  const viewAllHref = locality
    ? getLocalityUrl(locality.country_code, locality.city_slug)
    : `/search?q=${encodeURIComponent(city)}`;

  return (
    <RelatedBuildingRow
      title={`More architecture in ${city}`}
      viewAllHref={viewAllHref}
      viewAllLabel={`Explore ${city}`}
      buildings={buildings}
      isLoading={isLoading}
    />
  );
}

// ─── Static route exports ─────────────────────────────────────────────────────

export function HydrateFallback() {
  return (
    <AppLayout showBack title="Loading..." showHeader>
      <Skeleton className="h-56 sm:h-64 lg:h-80 w-full rounded-none" />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { id, slug } = useParams();
  const revalidator = useRevalidator();
  const pathHint = id && slug ? `${id}/${slug}` : id ?? null;

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <AppLayout showBack>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
            Building not found
          </h1>
          <p className="text-text-secondary max-w-md mb-6 text-sm md:text-base leading-relaxed">
            We couldn&apos;t find a building at this URL
            {pathHint ? (
              <> <span className="font-sans text-text-primary">({pathHint})</span></>
            ) : null}
            . It may have been removed or the link is incorrect.
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
          Something went wrong
        </h1>
        <p className="text-text-secondary max-w-md mb-6 text-sm md:text-base leading-relaxed">
          An unexpected error occurred while loading this building. You can try
          again or go back to explore.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            size="lg"
            variant="default"
            className="min-w-[200px]"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
          >
            Try again
          </Button>
          <Button asChild size="lg" variant="outline" className="min-w-[200px]">
            <Link to="/explore">Browse buildings</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuildingDetails {
  id: string;
  short_id?: number | null;
  slug?: string | null;
  name: string;
  alt_name?: string | null;
  aliases?: string[] | null;
  tier_rank?: string | null;
  location: unknown;
  location_precision?: "exact" | "approximate" | string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  year_completed: number;
  styles: { id: string; name: string }[];
  created_by: string;
  status?: string | null;
  access_level?: "public" | "private" | "restricted" | "commercial" | null;
  access_logistics?: "walk-in" | "booking_required" | "tour_only" | "exterior_only" | null;
  access_cost?: "free" | "paid" | "customers_only" | null;
  access_notes?: string | null;
  typology?: string[] | null;
  materials?: string[] | null;
  context?: string | null;
  intervention?: string | null;
  category?: string | null;
  architect_statement?: string | null;
  hero_image_id: string | null;
}

interface FeedEntry {
  id: string;
  user_id: string;
  content: string | null;
  rating: number | null;
  status: "visited" | "pending";
  tags: string[] | null;
  created_at: string;
  user: {
    username: string | null;
    avatar_url: string | null;
    is_verified_architect?: boolean;
    is_architect_of_building?: boolean;
  };
  images: { id: string; storage_path: string; created_at?: string }[];
}

interface DisplayImage {
  id: string;
  url: string;
  poster?: string;
  type?: "image" | "video";
  likes_count: number;
  created_at: string;
  user: { username: string | null; avatar_url: string | null } | null;
  is_generated?: boolean;
  is_official?: boolean;
}

function formatCatalogLabel(value: string | null | undefined): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  return v
    .split("_")
    .map((part) =>
      part.length === 0
        ? ""
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(" ");
}

interface StreamBlock {
  key: string;
  entryId: string;
  user: FeedEntry["user"];
  content: string | null;
  rating: number | null;
  status: FeedEntry["status"];
  images: DisplayImage[];
  isOfficial: boolean;
  topLikes: number;
  blockType: "featured" | "mosaic" | "image-review" | "image-only" | "text-only";
  score: number;
}

function StreamAuthorAttribution({
  user,
  rating,
}: {
  user: FeedEntry["user"];
  rating: number | null;
}) {
  const name = user.username?.trim();
  if (!name) return null;

  return (
    <div className="flex gap-3 items-start min-w-0">
      <Avatar className="h-12 w-12 shrink-0 rounded-full border border-border-default bg-surface-muted">
        <AvatarImage src={user.avatar_url || undefined} alt="" />
        <AvatarFallback className="text-sm font-semibold text-text-secondary">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            to={`/profile/${name}`}
            className="text-base md:text-lg font-semibold tracking-tight text-text-primary transition-colors hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
          {user.is_architect_of_building ? (
            <span
              className="inline-block h-2 w-2 shrink-0 bg-text-primary"
              aria-label="Architect of this building"
            />
          ) : null}
          {user.is_verified_architect ? (
            <BadgeCheck className="h-4 w-4 shrink-0 text-text-primary" aria-hidden />
          ) : null}
        </div>
        {rating != null ? (
          <div className="mt-1.5 flex gap-0.5" aria-label={`${rating} of 3 points`}>
            {[1, 2, 3].map((i) => (
              <Circle
                key={i}
                className={cn(
                  "h-2.5 w-2.5",
                  i <= rating
                    ? "fill-text-primary text-text-primary"
                    : "fill-transparent text-text-disabled",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export const meta: MetaFunction<typeof buildingLoader> = ({ data }) => {
  if (!data || !data.building) return [{ title: "Plano" }];
  const { building: rawBuilding, heroImageUrl, buildingCredits = [], locality } = data;
  const building = rawBuilding as BuildingDetails;
  const description = buildingDescription(building, buildingCredits);
  const image = heroImageUrl ?? `${SITE_URL}/cover.jpg`;
  const localityForBreadcrumb = locality && building.city && building.country
    ? { country_code: locality.country_code, city_slug: locality.city_slug, city: building.city, country: building.country }
    : null;
  const canonical = buildingCanonicalUrl(building, localityForBreadcrumb);
  return [
    { title: `${building.name} | Plano` },
    { name: "description", content: description },
    { property: "og:title", content: `${building.name} | Plano` },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: "Plano" },
    { property: "og:type", content: "place" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: `${building.name} | Plano` },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { tagName: "link", rel: "canonical", href: canonical },
    { "script:ld+json": buildingStructuredData(building, buildingCredits, undefined, localityForBreadcrumb) },
    { "script:ld+json": buildingBreadcrumbStructuredData(building, localityForBreadcrumb) },
    ...(heroImageUrl
      ? [{ tagName: "link", rel: "preload", as: "image", href: heroImageUrl, fetchpriority: "high" }]
      : []),
  ];
};

// ─── Pending photos queue ─────────────────────────────────────────────────────

interface PendingPhotoPreview {
  id: string;
  preview: string;
}

function PendingPhotosQueue({
  pendingImages,
  isSavingNote,
  onRemove,
  onSave,
}: {
  pendingImages: PendingPhotoPreview[];
  isSavingNote: boolean;
  onRemove: (id: string) => void;
  onSave: () => void;
}) {
  if (pendingImages.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pendingImages.map((img) => (
        <div key={img.id} className="relative h-16 w-16 shrink-0 bg-surface-muted">
          <img src={img.preview} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-surface-overlay text-text-primary hover:bg-surface-muted"
            onClick={() => onRemove(img.id)}
            aria-label="Remove pending photo"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={isSavingNote}
        className="text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary disabled:opacity-50"
        onClick={onSave}
      >
        {isSavingNote ? (
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden />
        ) : null}
        Save photos →
      </button>
    </div>
  );
}

// ─── Building info definition list ───────────────────────────────────────────

function BuildingInfoSection({
  building,
  buildingCredits,
}: {
  building: BuildingDetails;
  buildingCredits: import("@/features/credits/types").BuildingCreditWithEntities[];
}) {
  const primaryCredits = visiblePrimaryCredits(buildingCredits);

  const rows = useMemo(() => {
    const items: { label: string; value: ReactNode; key: string }[] = [];

    if (primaryCredits.length > 0) {
      items.push({
        key: "architect",
        label: "Architect",
        value: (
          <PrimaryCreditsLinks
            credits={buildingCredits}
            linkClassName="text-text-primary font-medium hover:underline underline-offset-2"
          />
        ),
      });
    }

    if (building.year_completed) {
      items.push({ key: "year", label: "Year", value: building.year_completed });
    }

    const locationParts = [building.address, building.city, building.country].filter(Boolean);
    if (locationParts.length > 0) {
      items.push({ key: "location", label: "Location", value: locationParts.join(", ") });
    }

    if (building.typology?.length) {
      items.push({ key: "typology", label: "Typology", value: building.typology.join(", ") });
    }

    if (building.styles?.length) {
      items.push({ key: "style", label: "Style", value: building.styles.map((s) => s.name).join(", ") });
    }

    if (building.materials?.length) {
      items.push({ key: "materials", label: "Materials", value: building.materials.join(", ") });
    }

    if (building.category?.trim()) {
      items.push({ key: "category", label: "Category", value: building.category });
    }

    if (building.context?.trim()) {
      items.push({ key: "context", label: "Context", value: formatCatalogLabel(building.context) });
    }

    if (building.intervention?.trim()) {
      items.push({ key: "intervention", label: "Intervention", value: formatCatalogLabel(building.intervention) });
    }

    if (building.access_level) {
      const accessParts = [
        formatCatalogLabel(building.access_level),
        formatCatalogLabel(building.access_logistics),
        formatCatalogLabel(building.access_cost),
      ].filter(Boolean);
      items.push({ key: "access", label: "Access", value: accessParts.join(" · ") });
    }

    if (building.access_notes?.trim()) {
      items.push({ key: "access-notes", label: "Access Notes", value: building.access_notes });
    }

    const aliases = (building.aliases ?? []).filter((a): a is string => typeof a === "string" && a.trim().length > 0);
    if (aliases.length > 0) {
      items.push({ key: "aliases", label: "Also known as", value: aliases.join(", ") });
    }

    return items;
  }, [building, buildingCredits, primaryCredits.length]);

  if (rows.length === 0) return null;

  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
        Building Info
      </h3>
      <dl className="mt-3 divide-y divide-border-default">
        {rows.map(({ key, label, value }) => (
          <div key={key} className="flex items-baseline gap-6 py-3">
            <dt className="text-xs text-text-secondary shrink-0 w-28">{label}</dt>
            <dd className="text-sm text-text-primary flex-1 min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ─── Technical tab placeholder ────────────────────────────────────────────────

function TechnicalSection({ canEdit }: { canEdit: boolean }) {
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  const sections = [
    {
      id: "drawings",
      icon: FileText,
      label: "Technical Drawings",
      description: "Floor plans, sections, elevations, and construction documents.",
    },
    {
      id: "renders",
      icon: Box,
      label: "3D Renders & Visualizations",
      description: "Renderings, models, and digital visualizations.",
    },
    {
      id: "construction",
      icon: Hammer,
      label: "Construction Details",
      description: "Construction process photos, material close-ups, and assembly details.",
    },
  ] as const;

  return (
    <>
      <div className="space-y-10">
        {sections.map(({ id, icon: Icon, label, description }) => (
          <section key={id}>
            <div className="flex items-start justify-between gap-4 border-b border-border-default pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted">
                  <Icon className="h-4 w-4 text-text-secondary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-text-primary">{label}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{description}</p>
                </div>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 text-xs"
                  onClick={() => setPendingSection(label)}
                >
                  <Plus className="h-3 w-3 mr-1.5" /> Add
                </Button>
              )}
            </div>
            <div className="flex flex-col items-center justify-center py-12 bg-surface-muted/40 rounded-xl border border-dashed border-border-strong/30 text-center">
              <Icon className="h-8 w-8 text-text-disabled opacity-30 mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">No {label.toLowerCase()} yet</p>
              <p className="text-xs text-text-secondary max-w-xs">
                {canEdit
                  ? "You can add content to this section using the button above."
                  : "Be the first to contribute to this section."}
              </p>
            </div>
          </section>
        ))}
      </div>

      <AlertDialog open={!!pendingSection} onOpenChange={(open) => { if (!open) setPendingSection(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Coming Soon</AlertDialogTitle>
            <AlertDialogDescription>
              Uploading {pendingSection?.toLowerCase()} is not yet available. This feature is
              actively being developed — check back soon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setPendingSection(null)}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function BuildingDetails() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const {
    building: loaderBuilding,
    heroImageUrl: initialHeroImageUrl,
    buildingCredits: initialBuildingCredits = [],
    locality,
  } = useLoaderData<typeof buildingLoader>();

  const loaderBuildingTyped = loaderBuilding as BuildingDetails | null | undefined;

  const { data: buildingCredits = initialBuildingCredits } = useQuery({
    queryKey: buildingCreditsQueryKey(loaderBuildingTyped?.id ?? ""),
    queryFn: () => getBuildingCredits(loaderBuildingTyped!.id),
    enabled: !!loaderBuildingTyped?.id,
    initialData: initialBuildingCredits,
    staleTime: 60_000,
  });

  const buildingCreditsFingerprint = useMemo(() => {
    const sorted = [...buildingCredits].sort((a, b) => a.id.localeCompare(b.id));
    return sorted
      .map((c) => `${c.id}:${c.personId ?? ""}:${c.companyId ?? ""}:${c.status}:${c.isLead ? "1" : "0"}`)
      .join("|");
  }, [buildingCredits]);

  const {
    building,
    heroImageUrl,
    loading,
    userStatus,
    myRating,
    hoverRating,
    setHoverRating,
    entries,
    displayImages,
    selectedImage,
    setSelectedImage,
    likedImageIds,
    selectedIndex,
    topLinks,
    likedLinkIds,
    userLinks,
    showLinkEditor,
    setShowLinkEditor,
    newLinkUrl,
    setNewLinkUrl,
    newLinkTitle,
    setNewLinkTitle,
    note,
    setNote,
    pendingImages,
    isSavingNote,
    showCollections,
    setShowCollections,
    selectedCollectionIds,
    setSelectedCollectionIds,
    initialCollectionIds,
    noteEditorOpen,
    setNoteEditorOpen,
    showDeleteAlert,
    setShowDeleteAlert,
    deleteWarningMessage,
    totalRatingPoints,
    visitorCount,
    coordinates,
    accessSynthesis,
    accessBadgeVariant,
    canEditOfficialData,
    isCreditsAdmin,
    handleStatusChange,
    handleRate,
    handleImageSelect,
    removePendingImage,
    handleAddLink,
    handleRemoveLink,
    handleSaveNote,
    handleDelete,
    handleSetHeroImage,
    handleToggleOfficial,
    handleLinkLike,
    handleNextImage,
    handlePrevImage,
  } = useBuildingInteractions({
    loaderBuilding: loaderBuildingTyped ?? null,
    initialHeroImageUrl,
    buildingCredits,
    buildingCreditsFingerprint,
    user,
    profile,
  });

  // ── Tab state (URL-based) ─────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId | null) ?? "overview";
  const setTab = useCallback(
    (id: TabId) => {
      setSearchParams(id === "overview" ? {} : { tab: id }, { replace: true });
    },
    [setSearchParams],
  );

  // ── Sticky tab bar detection ──────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isTabBarSticky, setIsTabBarSticky] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsTabBarSticky(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Pure UI state ─────────────────────────────────────────────────────────
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showDirectionsAlert, setShowDirectionsAlert] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<"all" | "photos" | "videos">("all");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMapExpanded) setIsMapExpanded(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMapExpanded]);

  // ── Editorial stream ──────────────────────────────────────────────────────

  const displayImageById = useMemo(
    () => new Map(displayImages.map((img) => [img.id, img])),
    [displayImages],
  );

  const sortedDisplayImages = useMemo(
    () => [...displayImages].sort((a, b) => b.likes_count - a.likes_count),
    [displayImages],
  );

  const filteredMediaImages = useMemo(() => {
    if (mediaFilter === "photos") return sortedDisplayImages.filter((img) => img.type !== "video");
    if (mediaFilter === "videos") return sortedDisplayImages.filter((img) => img.type === "video");
    return sortedDisplayImages;
  }, [sortedDisplayImages, mediaFilter]);

  const buildingSummaryForFeed = useMemo((): BuildingSummaryForFeed | null => {
    if (!building) return null;
    return {
      id: building.id,
      name: building.name,
      slug: building.slug ?? null,
      short_id: building.short_id ?? null,
      address: building.address,
      main_image_url: heroImageUrl,
      community_preview_url: null,
    };
  }, [building, heroImageUrl]);

  const activityOnlyFeedReviews = useMemo(() => {
    if (!buildingSummaryForFeed) return [];
    return entries
      .filter((e) => !e.content?.trim() && e.images.length === 0)
      .map((e) =>
        buildingEntryToFeedReview(e, buildingSummaryForFeed, displayImageById, likedImageIds),
      );
  }, [entries, buildingSummaryForFeed, displayImageById, likedImageIds]);

  const streamBlocks = useMemo((): StreamBlock[] => {
    const entryImageIds = new Set(
      entries.flatMap((e) => {
        const ids = e.images.map((img) => img.id);
        const videoKey = `video-${e.id}`;
        if (displayImageById.get(videoKey)?.type === "video") ids.push(videoKey);
        return ids;
      }),
    );

    const entryBlocks = entries
      .map((entry): StreamBlock | null => {
        const images = entry.images
          .map((img) => displayImageById.get(img.id))
          .filter((img): img is DisplayImage => img != null);

        const videoDisplay = displayImageById.get(`video-${entry.id}`);
        const hasVideo = videoDisplay?.type === "video";
        const isOfficial = images.some((img) => img.is_official);
        const topLikes = images.reduce((max, img) => Math.max(max, img.likes_count), 0);
        const hasContent = !!(entry.content?.trim());
        const imageCount = images.length;

        if (imageCount === 0 && !hasContent && !hasVideo) return null;

        const architectBoost = entry.user?.is_architect_of_building ? 800 : 0;
        const score =
          architectBoost +
          (isOfficial ? 1000 : 0) +
          topLikes * 10 +
          (hasContent ? 20 : 0) +
          (imageCount > 1 ? 15 : 0) +
          (hasVideo && imageCount === 0 ? 10 : 0);

        let blockType: StreamBlock["blockType"];
        if (isOfficial) blockType = "featured";
        else if (imageCount >= 2) blockType = "mosaic";
        else if ((imageCount === 1 || hasVideo) && hasContent) blockType = "image-review";
        else if (imageCount === 1 || hasVideo) blockType = "image-only";
        else blockType = "text-only";

        return {
          key: entry.id,
          entryId: entry.id,
          user: entry.user,
          content: entry.content,
          rating: entry.rating,
          status: entry.status,
          images,
          isOfficial,
          topLikes,
          blockType,
          score,
        };
      })
      .filter((b): b is StreamBlock => b !== null);

    const orphanBlocks: StreamBlock[] = displayImages
      .filter((img) => !entryImageIds.has(img.id))
      .map((img): StreamBlock => ({
        key: `img-${img.id}`,
        entryId: `img-${img.id}`,
        user: img.user ?? { username: null, avatar_url: null },
        content: null,
        rating: null,
        status: "visited" as const,
        images: [img],
        isOfficial: img.is_official ?? false,
        topLikes: img.likes_count,
        blockType: (img.is_official ?? false) ? "featured" : "image-only",
        score: ((img.is_official ?? false) ? 1000 : 0) + img.likes_count * 10,
      }));

    return [...entryBlocks, ...orphanBlocks].sort((a, b) => b.score - a.score);
  }, [entries, displayImages, displayImageById]);

  const renderStreamBlock = useCallback(
    (block: StreamBlock) => {
      const { images, content, user, rating, isOfficial, topLikes, blockType } = block;
      const preview = content && content.length > 220 ? content.slice(0, 220) + "…" : content;
      const authorAttribution =
        user?.username?.trim() ? (
          <StreamAuthorAttribution user={user} rating={rating} />
        ) : null;

      if (blockType === "featured") {
        const img = images[0];
        if (!img) return null;
        return (
          <div key={block.key} className="rounded-xl border border-border-default overflow-hidden bg-surface-card shadow-sm">
            <div
              className="group relative aspect-[16/10] cursor-pointer overflow-hidden bg-surface-muted"
              onClick={() => setSelectedImage(img)}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {isOfficial && (
                <span className="absolute left-4 top-4 bg-brand-accent px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-brand-accent-foreground rounded-sm">
                  Official
                </span>
              )}
              {img.likes_count > 0 && (
                <span className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[11px] font-bold text-white drop-shadow-md">
                  <Heart className="h-3.5 w-3.5 fill-brand-accent text-brand-accent" aria-hidden />
                  {img.likes_count}
                </span>
              )}
            </div>
            {(preview || authorAttribution) && (
              <div className="p-4 space-y-3">
                {authorAttribution}
                {preview && (
                  <Link to={`/review/${block.entryId}`} className="group/r block">
                    <p className="text-sm leading-relaxed text-text-secondary italic group-hover/r:text-text-primary">
                      &ldquo;{preview}&rdquo;
                    </p>
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      }

      if (blockType === "mosaic") {
        return (
          <div key={block.key} className="rounded-xl border border-border-default overflow-hidden bg-surface-card shadow-sm">
            <div className={cn("grid gap-px bg-border-default", images.length >= 4 ? "grid-cols-2" : "grid-cols-2")}>
              {images.slice(0, 4).map((img, i) => (
                <div
                  key={img.id}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden bg-surface-muted",
                    images.length === 3 && i === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square",
                  )}
                  onClick={() => setSelectedImage(img)}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {img.likes_count > 0 && (
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow">
                      <Heart className="h-2.5 w-2.5 fill-white" aria-hidden />
                      {img.likes_count}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {(preview || authorAttribution) && (
              <div className="p-4 space-y-3">
                {authorAttribution}
                {preview && (
                  <Link to={`/review/${block.entryId}`} className="group/r block">
                    <p className="text-sm leading-relaxed text-text-secondary italic group-hover/r:text-text-primary">
                      &ldquo;{preview}&rdquo;
                    </p>
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      }

      if (blockType === "image-review") {
        const img = images[0];
        if (!img) return null;
        return (
          <div key={block.key} className="rounded-xl border border-border-default overflow-hidden bg-surface-card shadow-sm">
            <div
              className="group relative aspect-[4/3] cursor-pointer overflow-hidden bg-surface-muted"
              onClick={() => setSelectedImage(img)}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {img.likes_count > 0 && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-white drop-shadow">
                  <Heart className="h-3 w-3 fill-white" aria-hidden />
                  {img.likes_count}
                </span>
              )}
            </div>
            <div className="p-4 space-y-3">
              {authorAttribution}
              {preview && (
                <Link to={`/review/${block.entryId}`} className="group/r block">
                  <p className="text-sm leading-relaxed text-text-secondary italic group-hover/r:text-text-primary">
                    &ldquo;{preview}&rdquo;
                  </p>
                </Link>
              )}
            </div>
          </div>
        );
      }

      if (blockType === "image-only") {
        const img = images[0];
        if (!img) return null;
        const isTall = topLikes >= 10;
        return (
          <div key={block.key} className="group rounded-xl border border-border-default overflow-hidden bg-surface-card shadow-sm">
            <div
              className={cn(
                "relative cursor-pointer overflow-hidden bg-surface-muted",
                isTall ? "aspect-[4/5]" : "aspect-[4/3]",
              )}
              onClick={() => setSelectedImage(img)}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {img.likes_count > 0 && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-white">
                  <Heart className="h-3 w-3 fill-white" aria-hidden />
                  {img.likes_count}
                </span>
              )}
            </div>
            {authorAttribution && <div className="p-4">{authorAttribution}</div>}
          </div>
        );
      }

      if (blockType === "text-only") {
        if (!preview) return null;
        return (
          <div key={block.key} className="rounded-xl border border-border-default bg-surface-card shadow-sm p-5 space-y-3">
            {authorAttribution}
            <Link to={`/review/${block.entryId}`} className="group/r block">
              <p className="text-sm leading-relaxed text-text-secondary italic group-hover/r:text-text-primary">
                &ldquo;{preview}&rdquo;
              </p>
            </Link>
          </div>
        );
      }

      return null;
    },
    [setSelectedImage],
  );

  // ── Loading guard ─────────────────────────────────────────────────────────

  if (loading || !building) {
    return (
      <AppLayout title="Loading...">
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" aria-hidden />
        </div>
      </AppLayout>
    );
  }

  // ─── Derived values ───────────────────────────────────────────────────────

  const primaryCredit = visiblePrimaryCredits(buildingCredits)[0] ?? null;
  const primaryName = primaryCredit?.person?.name ?? primaryCredit?.company?.name ?? null;
  const heroAlt = [
    building.name,
    primaryName ? `by ${primaryName}` : null,
    building.year_completed ? `(${building.year_completed})` : null,
    building.city && building.country ? `— ${building.city}, ${building.country}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const isStatusBuilding =
    building.status === "Lost" ||
    building.status === "Unbuilt" ||
    building.status === "Under Construction";

  const buildingUrl = getBuildingUrl(building.id, building.slug, building.short_id);

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────

  return (
    <AppLayout title={building.name} showBack showHeader>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-surface-default"
      >
        {/* ── HERO — full-bleed, fixed height, no rounding ── */}
        <div className="h-56 sm:h-64 lg:h-80 w-full overflow-hidden bg-surface-muted">
          {heroImageUrl ? (
            <motion.img
              key={heroImageUrl}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              src={heroImageUrl}
              alt={heroAlt}
              className="h-full w-full object-cover"
              // @ts-expect-error fetchPriority is valid but not yet in React types
              fetchPriority="high"
              loading="eager"
            />
          ) : null}
        </div>

        {/* ── BUILDING HEADER — title, metadata row, stats ── */}
        <div className="border-b border-border-default">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">

              {/* Title & metadata */}
              <div className="lg:col-span-8 space-y-2">
                {(building.tier_rank || isStatusBuilding) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {building.tier_rank && (
                      <span className="inline-block px-2 py-0.5 bg-brand-accent text-brand-accent-foreground text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm">
                        {building.tier_rank}
                      </span>
                    )}
                    {isStatusBuilding && (
                      <span className="inline-block px-2 py-0.5 bg-feedback-destructive/10 text-feedback-destructive text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm border border-feedback-destructive/20">
                        {building.status}
                      </span>
                    )}
                  </div>
                )}

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-primary leading-tight">
                  {building.name}
                </h1>

                {building.alt_name && (
                  <p className="text-base text-text-secondary">{building.alt_name}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary pt-1">
                  {primaryName && (
                    <span className="flex items-center gap-1.5">
                      <span className="text-text-disabled">by</span>
                      <PrimaryCreditsLinks
                        credits={buildingCredits}
                        linkClassName="text-text-primary font-medium hover:underline underline-offset-2"
                      />
                    </span>
                  )}
                  {building.year_completed && (
                    <>
                      <span className="text-border-strong" aria-hidden>·</span>
                      <span>{building.year_completed}</span>
                    </>
                  )}
                  {(building.city || building.country) && (
                    <>
                      <span className="text-border-strong" aria-hidden>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-text-disabled shrink-0" />
                        {[building.city, building.country].filter(Boolean).join(", ")}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Stats & actions */}
              <div className="lg:col-span-4 flex items-center gap-4 justify-start lg:justify-end">
                <div className="flex items-center gap-5 pr-5 border-r border-border-default">
                  <div>
                    <div className="text-xl font-bold font-display tabular-nums">{visitorCount}</div>
                    <div className="text-[10px] uppercase tracking-widest text-text-secondary">Visits</div>
                  </div>
                  {totalRatingPoints !== null && totalRatingPoints > 0 && (
                    <div>
                      <div className="text-xl font-bold font-display tabular-nums">{totalRatingPoints}</div>
                      <div className="text-[10px] uppercase tracking-widest text-text-secondary">Points</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </Button>
                  {canEditOfficialData && (
                    <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
                      <Link to={`${buildingUrl}/edit`}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Sentinel — sticky tab bar triggers when this leaves viewport */}
        <div ref={sentinelRef} aria-hidden className="h-0" />

        {/* ── TAB BAR ── */}
        <div
          className={cn(
            "border-b border-border-default bg-surface-default transition-shadow duration-200",
            isTabBarSticky && "sticky top-0 z-30 shadow-sm",
          )}
        >
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center -mb-px overflow-x-auto scrollbar-none">
              {isTabBarSticky && (
                <span className="hidden sm:block text-sm font-medium text-text-secondary pr-5 mr-1 border-r border-border-default shrink-0 truncate max-w-[180px] py-3.5">
                  {building.name}
                </span>
              )}
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={cn(
                    "px-5 py-3.5 text-sm font-medium border-b-2 shrink-0 transition-colors duration-150 whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-text-primary text-text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

            {/* ── MAIN CONTENT COLUMN ── */}
            <div className="lg:col-span-8 min-w-0">

              {/* ════ OVERVIEW TAB ════ */}
              {activeTab === "overview" && (
                <div className="space-y-12">

                  {/* Status alert */}
                  {isStatusBuilding && (
                    <div className="flex items-start gap-4 p-5 rounded-lg bg-feedback-destructive/5 border border-feedback-destructive/20">
                      <AlertTriangle className="h-5 w-5 text-feedback-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-feedback-destructive uppercase tracking-wider mb-1">
                          {building.status}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {building.status === "Lost"
                            ? "This building no longer stands at this location."
                            : building.status === "Unbuilt"
                              ? "This project was never built and exists only in records."
                              : "This building is currently under construction."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Architect statement */}
                  {building.architect_statement && (
                    <ArchitectStatement
                      statement={building.architect_statement}
                      isEditing={false}
                      onChange={() => {}}
                      architectName={leadAttributionFromCredits(buildingCredits)}
                    />
                  )}

                  {/* Community highlights — top 4 scored blocks */}
                  <section className="space-y-8">
                    <div className="flex items-center justify-between border-b border-border-default pb-4">
                      <h3 className="font-display text-xl font-bold tracking-tight">
                        Community Highlights
                      </h3>
                      <button
                        type="button"
                        onClick={() => setTab("media")}
                        className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                      >
                        View all →
                      </button>
                    </div>

                    {streamBlocks.length > 0 ? (
                      <div className="space-y-10">
                        {streamBlocks.slice(0, 4).map((block) => (
                          <motion.div
                            key={block.key}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.4 }}
                          >
                            {renderStreamBlock(block)}
                          </motion.div>
                        ))}
                        {streamBlocks.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setTab("media")}
                            className="w-full py-4 rounded-xl border border-dashed border-border-strong/40 text-sm text-text-secondary hover:text-text-primary hover:border-border-strong transition-all"
                          >
                            + {streamBlocks.length - 4} more in Media tab
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 bg-surface-muted/30 rounded-xl border border-dashed border-border-strong/30 text-center">
                        <ImageIcon className="h-10 w-10 text-text-disabled opacity-25 mb-3" />
                        <p className="text-sm font-medium text-text-primary mb-1">No photos yet</p>
                        <p className="text-xs text-text-secondary max-w-xs mb-5">
                          Be the first to share this building with the community.
                        </p>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`${buildingUrl}/review`}>Add Review</Link>
                        </Button>
                      </div>
                    )}
                  </section>

                  {/* Related buildings */}
                  <ClientOnly>
                    <RelatedByArchitectSection building={building} primaryCredit={primaryCredit} />
                    {building.city && (
                      <RelatedByCitySection building={building} locality={locality} />
                    )}
                  </ClientOnly>
                </div>
              )}

              {/* ════ MEDIA TAB ════ */}
              {activeTab === "media" && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold tracking-tight">Media</h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
                        onClick={() => document.getElementById("building-file-input")?.click()}
                      >
                        <Plus className="h-3 w-3" /> Upload
                      </button>
                      <input
                        id="building-file-input"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                      <Link
                        to={`${buildingUrl}/review`}
                        className="text-[10px] font-bold uppercase tracking-widest bg-text-primary text-white px-3 py-1.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        Add Review
                      </Link>
                    </div>
                  </div>

                  {/* Filter strip */}
                  <div className="flex gap-1 border-b border-border-default -mb-px">
                    {(["all", "photos", "videos"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setMediaFilter(f)}
                        className={cn(
                          "px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors capitalize",
                          mediaFilter === f
                            ? "border-text-primary text-text-primary"
                            : "border-transparent text-text-secondary hover:text-text-primary",
                        )}
                      >
                        {f}
                        {f === "all" && sortedDisplayImages.length > 0 && (
                          <span className="ml-1.5 text-text-disabled font-normal normal-case tracking-normal">
                            {sortedDisplayImages.length}
                          </span>
                        )}
                        {f === "videos" && sortedDisplayImages.filter((i) => i.type === "video").length > 0 && (
                          <span className="ml-1.5 text-text-disabled font-normal normal-case tracking-normal">
                            {sortedDisplayImages.filter((i) => i.type === "video").length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <WidgetErrorBoundary>
                    {filteredMediaImages.length > 0 ? (
                      <div className="columns-2 gap-3">
                        {filteredMediaImages.map((img) => (
                          <div
                            key={img.id}
                            className="group relative break-inside-avoid mb-3 cursor-pointer overflow-hidden rounded-xl bg-surface-muted shadow-sm"
                            onClick={() => setSelectedImage(img)}
                          >
                            {img.type === "video" ? (
                              <div className="aspect-video flex items-center justify-center bg-surface-muted">
                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-black/50">
                                  <div className="border-l-[14px] border-l-white border-y-8 border-y-transparent ml-1" />
                                </div>
                              </div>
                            ) : (
                              <img
                                src={img.url}
                                alt=""
                                className="block w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            )}
                            {img.likes_count > 0 && (
                              <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow">
                                <Heart className="h-2.5 w-2.5 fill-white" aria-hidden />
                                {img.likes_count}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 bg-surface-muted/30 rounded-xl border border-dashed border-border-strong/30 text-center">
                        <ImageIcon className="h-12 w-12 text-text-disabled opacity-25 mb-4" />
                        <h4 className="text-lg font-medium text-text-primary mb-2">
                          {mediaFilter === "all" ? "No photos yet" : `No ${mediaFilter} yet`}
                        </h4>
                        <p className="text-sm text-text-secondary max-w-xs mb-6">
                          Be the first to capture this building and share it with the community.
                        </p>
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById("building-file-input")?.click()}
                          >
                            Upload Photo
                          </Button>
                          <Button size="sm" asChild>
                            <Link to={`${buildingUrl}/review`}>Write Review</Link>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Text-only reviews */}
                    {streamBlocks.filter((b) => b.blockType === "text-only").length > 0 && (
                      <div className="mt-8 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary pt-6 border-t border-border-default">
                          Reviews
                        </h4>
                        {streamBlocks
                          .filter((b) => b.blockType === "text-only")
                          .map((block) => renderStreamBlock(block))}
                      </div>
                    )}

                    {activityOnlyFeedReviews.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-border-default">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-5">
                          Recent Activity
                        </h4>
                        <ActivityStreamGroup entries={activityOnlyFeedReviews} hideGroupLabel />
                      </div>
                    )}
                  </WidgetErrorBoundary>
                </div>
              )}

              {/* ════ TECHNICAL TAB ════ */}
              {activeTab === "technical" && (
                <TechnicalSection canEdit={canEditOfficialData} />
              )}

              {/* ════ CREDITS TAB ════ */}
              {activeTab === "credits" && (
                <div className="space-y-12">

                  {/* Full credits */}
                  <section>
                    <h3 className="font-display text-xl font-bold tracking-tight border-b border-border-default pb-4 mb-6">
                      Credits
                    </h3>
                    <BuildingCredits
                      buildingId={building.id}
                      credits={buildingCredits}
                      isAuthenticated={Boolean(user)}
                      isAdmin={isCreditsAdmin}
                    />
                  </section>

                  {/* Resources */}
                  <section className="border-t border-border-default pt-12 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
                        Resources
                      </h4>
                      {user && (
                        <button
                          type="button"
                          onClick={() => setShowLinkEditor(!showLinkEditor)}
                          className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                        >
                          {showLinkEditor ? "Close" : "Add link"}
                        </button>
                      )}
                    </div>

                    {showLinkEditor && user && (
                      <div className="flex flex-col sm:flex-row gap-2 p-4 bg-surface-muted rounded-lg">
                        <Input
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="https://"
                          className="flex-1 h-9 text-sm"
                        />
                        <Input
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                          placeholder="Title (optional)"
                          className="flex-1 h-9 text-sm"
                        />
                        <Button
                          size="sm"
                          className="h-9"
                          onClick={() => void handleAddLink()}
                          disabled={!newLinkUrl.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    )}

                    {topLinks.length > 0 ? (
                      <div className="divide-y divide-border-default">
                        {topLinks.map((link) => {
                          let domain = "";
                          try { domain = new URL(link.url).hostname; } catch { /* ignore */ }
                          return (
                            <div key={link.link_id} className="group py-4 flex items-center justify-between gap-4">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-0 flex-1"
                              >
                                <div className="text-sm font-semibold truncate group-hover:underline underline-offset-2">
                                  {link.title || domain}
                                </div>
                                <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">
                                  {domain}
                                </div>
                              </a>
                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); void handleLinkLike(link.link_id); }}
                                  className={cn(
                                    "flex items-center gap-1 text-[10px] font-bold transition-colors",
                                    likedLinkIds.has(link.link_id)
                                      ? "text-text-primary"
                                      : "text-text-disabled hover:text-text-primary",
                                  )}
                                >
                                  <Heart
                                    className={cn(
                                      "h-3 w-3",
                                      likedLinkIds.has(link.link_id) && "fill-current",
                                    )}
                                  />
                                  {link.like_count}
                                </button>
                                <ExternalLink className="h-3.5 w-3.5 text-text-disabled group-hover:text-text-primary transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary italic">No external resources added yet.</p>
                    )}
                  </section>

                </div>
              )}

            </div>

            {/* ── SIDEBAR — Right Column ── */}
            <div className="lg:col-span-4">
              <div className="space-y-5">

                {/* Building info — always visible */}
                <div className="bg-surface-card border border-border-default rounded-xl p-5 shadow-sm">
                  <BuildingInfoSection building={building} buildingCredits={buildingCredits} />
                </div>

              <div className="lg:sticky lg:top-14 space-y-5">

                {/* Action card */}
                <div className="bg-surface-card border border-border-default rounded-xl p-5 shadow-sm space-y-5">

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                      My Status
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-10 px-3 text-sm font-medium"
                        >
                          <div className="flex items-center gap-2">
                            {userStatus === "visited" ? (
                              <Check className="h-4 w-4 text-feedback-success" />
                            ) : userStatus === "pending" ? (
                              <Bookmark className="h-4 w-4 text-brand-accent fill-current" />
                            ) : (
                              <Circle className="h-4 w-4 text-text-disabled" />
                            )}
                            {userStatus === "visited"
                              ? "Visited"
                              : userStatus === "pending"
                                ? "Saved"
                                : "Add to list"}
                          </div>
                          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[220px] p-2">
                        <DropdownMenuItem
                          className="rounded-md py-2.5"
                          onSelect={() => void handleStatusChange("visited")}
                        >
                          <Check className="mr-3 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-bold text-xs uppercase tracking-wider">Visited</p>
                            <p className="text-[10px] text-text-secondary">I've seen this in person</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-md py-2.5"
                          onSelect={() => void handleStatusChange("pending")}
                        >
                          <Bookmark className="mr-3 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-bold text-xs uppercase tracking-wider">Wishlist</p>
                            <p className="text-[10px] text-text-secondary">I want to visit this</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-md py-2.5"
                          onSelect={() => void handleStatusChange("ignored")}
                        >
                          <EyeOff className="mr-3 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-bold text-xs uppercase tracking-wider">Hide</p>
                            <p className="text-[10px] text-text-secondary">Don&apos;t show in my feed</p>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Rating */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                        My Rating
                      </label>
                      {myRating > 0 && (
                        <span className="text-[10px] font-bold text-text-secondary">
                          {myRating}/3
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center justify-center gap-5 p-3 bg-surface-muted rounded-lg"
                      onMouseLeave={() => setHoverRating(null)}
                    >
                      {[1, 2, 3].map((i) => {
                        const filled = hoverRating !== null ? i <= hoverRating : i <= myRating;
                        return (
                          <motion.button
                            key={i}
                            type="button"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => void handleRate(building.id, i === myRating ? 0 : i)}
                            onMouseEnter={() => setHoverRating(i)}
                            className="cursor-pointer"
                          >
                            <Circle
                              className={cn(
                                "h-7 w-7 transition-all duration-200",
                                filled
                                  ? "fill-brand-accent text-brand-accent"
                                  : "fill-transparent text-text-disabled opacity-50",
                              )}
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Secondary actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setNoteEditorOpen(!noteEditorOpen)}
                      className="h-9 text-[10px] font-bold uppercase tracking-wider bg-surface-muted hover:bg-border-default border-none"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Note
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowCollections(!showCollections)}
                      className="h-9 text-[10px] font-bold uppercase tracking-wider bg-surface-muted hover:bg-border-default border-none"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Collection
                    </Button>
                  </div>

                  {/* Note editor */}
                  <AnimatePresence>
                    {noteEditorOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-3 pt-4 border-t border-border-default"
                      >
                        <Textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Add a note or review..."
                          className="min-h-[100px] text-sm resize-none"
                        />
                        <PendingPhotosQueue
                          pendingImages={pendingImages}
                          isSavingNote={isSavingNote}
                          onRemove={removePendingImage}
                          onSave={() => void handleSaveNote()}
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setNoteEditorOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void handleSaveNote()}
                            disabled={isSavingNote}
                          >
                            {isSavingNote && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Save
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Collection selector */}
                  <AnimatePresence>
                    {showCollections && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-border-default pt-4"
                      >
                        <CollectionSelector
                          buildingId={building.id}
                          selectedIds={selectedCollectionIds}
                          initialIds={initialCollectionIds}
                          onChange={setSelectedCollectionIds}
                          onClose={() => setShowCollections(false)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                {/* Map card */}
                <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden shadow-sm">
                  <div className="h-44 relative">
                    {coordinates ? (
                      <div className="h-full w-full grayscale-[0.4] hover:grayscale-0 transition-all duration-700">
                        <BuildingLocationMap
                          lat={coordinates.lat}
                          lng={coordinates.lng}
                          isExpanded={isMapExpanded}
                          onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                          className="h-full w-full"
                        />
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-surface-muted">
                        <MapPin className="h-6 w-6 text-text-disabled" />
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 flex items-center justify-between border-t border-border-default">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary min-w-0">
                      <MapPin className="h-3 w-3 text-text-disabled shrink-0" />
                      <span className="truncate">
                        {[building.city, building.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest shrink-0"
                      onClick={() => {
                        if (building.location_precision === "approximate") {
                          setShowDirectionsAlert(true);
                        } else {
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${coordinates?.lat},${coordinates?.lng}`,
                            "_blank",
                          );
                        }
                      }}
                    >
                      Directions <Navigation className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Overview sidebar: credits preview */}
                {activeTab === "overview" && buildingCredits.length > 0 && (
                  <div className="bg-surface-card border border-border-default rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                        Credits
                      </h4>
                      <button
                        type="button"
                        onClick={() => setTab("credits")}
                        className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                      >
                        All →
                      </button>
                    </div>
                    <BuildingCreditsPreview
                      credits={buildingCredits}
                      buildingId={building.id}
                      isAuthenticated={Boolean(user)}
                    />
                  </div>
                )}

                {/* Credits tab sidebar: contributors */}
                {activeTab === "credits" && (
                  <div className="bg-surface-card border border-border-default rounded-xl p-5 shadow-sm">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4">
                      Contributors
                    </h4>
                    <BuildingContributorsInline buildingId={building.id} />
                  </div>
                )}

                {/* Technical tab sidebar: contribution guide */}
                {activeTab === "technical" && (
                  <div className="bg-surface-card border border-border-default rounded-xl p-5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                      Contribute
                    </h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Help build the world&apos;s most complete architecture database by contributing technical drawings, renders, and construction documentation.
                    </p>
                    {user ? (
                      <Button size="sm" variant="outline" className="w-full h-9 text-xs" disabled>
                        Upload Technical Content
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full h-9 text-xs" asChild>
                        <Link to="/login">Sign in to contribute</Link>
                      </Button>
                    )}
                  </div>
                )}

              </div>
              </div>
            </div>

          </div>
        </div>

      </motion.div>

      {/* ── DIALOGS ── */}
      <ImageDetailsDialog
        imageId={selectedImage?.id || null}
        initialUrl={selectedImage?.url || null}
        type={selectedImage?.type || "image"}
        uploadedBy={selectedImage?.user || null}
        uploadDate={selectedImage?.created_at}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        onNext={handleNextImage}
        onPrev={handlePrevImage}
        hasNext={selectedIndex < displayImages.length - 1}
        hasPrev={selectedIndex > 0}
        isGenerated={selectedImage?.is_generated}
        isOfficial={selectedImage?.is_official}
        isHero={selectedImage?.id === building?.hero_image_id}
        canEdit={canEditOfficialData}
        onToggleOfficial={handleToggleOfficial}
        onSetHero={handleSetHeroImage}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from list?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteWarningMessage ||
                "This will delete your rating, status, and any notes for this building. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-feedback-destructive text-feedback-destructive-foreground hover:opacity-90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDirectionsAlert} onOpenChange={setShowDirectionsAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exact Location Unknown</AlertDialogTitle>
            <AlertDialogDescription>
              This building&apos;s location is approximate. The directions will guide you to the
              general vicinity. Please look around when you arrive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${coordinates?.lat},${coordinates?.lng}`,
                  "_blank",
                )
              }
            >
              {building.status === "Lost" ? "Navigate to Site" : "Get Directions"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
