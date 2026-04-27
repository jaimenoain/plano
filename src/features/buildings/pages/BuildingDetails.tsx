import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  createElement,
  type ReactNode,
} from "react";
import {
  useParams,
  Link,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  useRevalidator,
  type MetaFunction,
} from "react-router";
import {
  Loader2, MapPin, Send,
  Check, Bookmark, Image as ImageIcon,
  Heart, ExternalLink, Circle, AlertTriangle, Search,
  EyeOff, Plus, Users, X,
  Pencil, BadgeCheck, ChevronDown, Share2, Navigation,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { UserPicker } from "@/components/common/UserPicker";
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
import { BuildingHero } from "../components/BuildingHero";
import { BuildingCredits, BuildingCreditsPreview } from "../components/BuildingCredits";
import { BuildingContributorsInline } from "../components/BuildingContributorsInline";
import { BuildingContributorsSection } from "../components/BuildingContributorsSection";
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
import { resolveCardType } from "@/features/feed/utils/resolveCardType";
import { DetailCard } from "@/features/feed/components/DetailCard";
import { DetailSectionHeader } from "@/features/feed/components/DetailSectionHeader";
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

// ─── Related buildings sub-components ────────────────────────────────────────

function RelatedBuildingCard({ b }: { b: RelatedBuilding }) {
  return (
    <Link
      to={b.buildingUrl}
      className="flex-shrink-0 w-40 sm:w-48 group"
    >
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

function RelatedBuildingRow({ title, viewAllHref, viewAllLabel, buildings, isLoading }: {
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

function RelatedByCitySection({ building, locality }: { building: BuildingDetails; locality: { country_code: string; city_slug: string } | null }) {
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
      <div className="w-full bg-surface-muted animate-pulse h-[50vh]" />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
            <Skeleton className="h-20 w-3/4" />
            <Skeleton className="h-40 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-8">
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

/** Kept here because StreamBlock references FeedEntry["user"] and FeedEntry["status"]. */
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

/** Catalogue / enum strings for display (snake_case → Title Case words). */
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

/**
 * A single scored, typed unit in the editorial photo + review stream.
 * Derived from entries + displayImages in the streamBlocks useMemo.
 */
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

/** Magazine-style byline for the editorial stream — avatar + prominent author name. */
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
    // TODO: pass ratingData once review count is available from loader
    { "script:ld+json": buildingStructuredData(building, buildingCredits, undefined, localityForBreadcrumb) },
    { "script:ld+json": buildingBreadcrumbStructuredData(building, localityForBreadcrumb) },
    ...(heroImageUrl
      ? [{ tagName: "link", rel: "preload", as: "image", href: heroImageUrl, fetchpriority: "high" }]
      : []),
  ];
};

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
        <div
          key={img.id}
          className="relative h-16 w-16 shrink-0 bg-surface-muted"
        >
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

  // ── BuildingCredits query — lives here so the queryKey is stable ──────────
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
      .map(
        (c) =>
          `${c.id}:${c.personId ?? ""}:${c.companyId ?? ""}:${c.status}:${c.isLead ? "1" : "0"}`,
      )
      .join("|");
  }, [buildingCredits]);

  // ── All data, state and handlers ──────────────────────────────────────────
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
    linksLoading,
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
    showVisitWith,
    setShowVisitWith,
    selectedFriends,
    setSelectedFriends,
    sendingInvites,
    noteEditorOpen,
    setNoteEditorOpen,
    showDeleteAlert,
    setShowDeleteAlert,
    deleteWarningMessage,
    totalRatingPoints,
    visitorCount,
    coordinates,
    googleSearchUrl,
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
    handleSendInvites,
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

  // ── Pure UI state (no async, no handler in hook needs these) ─────────────
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showDirectionsAlert, setShowDirectionsAlert] = useState(false);
  const [ratingAreaHovered, setRatingAreaHovered] = useState(false);

  const buildingInteractionsExpanded =
    noteEditorOpen || showCollections || showVisitWith;

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

  /** Non-activity review rows (text and/or media) — matches DetailCard list; excludes visited-only rows in "Also visited". */
  const detailSectionContributionCount = useMemo(() => {
    if (!buildingSummaryForFeed) return 0;
    let n = 0;
    for (const e of entries) {
      const feedReview = buildingEntryToFeedReview(
        e,
        buildingSummaryForFeed,
        displayImageById,
        likedImageIds,
      );
      if (resolveCardType(feedReview) !== "activity") n += 1;
    }
    return n;
  }, [entries, buildingSummaryForFeed, displayImageById, likedImageIds]);

  /**
   * Merges entries and orphaned display images into scored, typed stream blocks.
   *
   * Block types (derived from content shape):
   *   featured    — official image → always first, full-width 16:9
   *   mosaic      — 2+ images from one review → 3fr/2fr grid
   *   image-review — 1 image + review text → side-by-side (stacked on mobile)
   *   image-only  — 1 image, no text → full-width, taller when highly liked
   *   text-only   — no images, has text → pull-quote
   *
   * Score = (is_official × 1000) + (top_likes × 10) + (has_content × 20)
   *       + (multi_image × 15)
   */
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
        const topLikes = images.reduce(
          (max, img) => Math.max(max, img.likes_count),
          0,
        );
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

    // Orphaned display images — official uploads not tied to any review entry
    const orphanBlocks: StreamBlock[] = displayImages
      .filter((img) => !entryImageIds.has(img.id))
      .map((img): StreamBlock => ({
        key: `img-${img.id}`,
        entryId: `img-${img.id}`,
        user: img.user ?? {
          username: null,
          avatar_url: null,
        },
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

  const hasBuildingInfoDetail = useMemo(() => {
    if (!building) return false;
    const aliases = (building.aliases ?? []).filter(
      (a): a is string => typeof a === "string" && a.trim().length > 0,
    );
    return !!(
      building.category?.trim() ||
      (building.materials?.length ?? 0) > 0 ||
      building.context?.trim() ||
      building.intervention?.trim() ||
      aliases.length > 0 ||
      building.address?.trim() ||
      building.access_level ||
      building.access_logistics ||
      building.access_cost
    );
  }, [building]);

  const showBuildingInfoExtended = hasBuildingInfoDetail || canEditOfficialData;

  const renderStreamBlock = useCallback(
    (block: StreamBlock) => {
      const { images, content, user, rating, isOfficial, topLikes } = block;

      const preview =
        content && content.length > 220 ? content.slice(0, 220) + "…" : content;

      const authorAttribution =
        user && user.username?.trim() ? (
          <StreamAuthorAttribution user={user} rating={rating} />
        ) : null;

      const isOrphanImage = block.entryId.startsWith("img-");

      if (!isOrphanImage && buildingSummaryForFeed) {
        const source = entries.find((e) => e.id === block.entryId);
        if (source) {
          const feedReview = buildingEntryToFeedReview(
            source,
            buildingSummaryForFeed,
            displayImageById,
            likedImageIds,
          );
          const t = resolveCardType(feedReview);
          const wrap = (node: ReactNode) => <div key={block.key}>{node}</div>;
          if (t === "activity") return null;
          return wrap(<DetailCard entry={feedReview} />);
        }
        return null;
      }

      switch (block.blockType) {

        // ── E: Featured — official or highest-signal ──────────────────────────
        case "featured": {
          const img = images[0];
          if (!img) return null;
          return (
            <div key={block.key} className="space-y-4">
              <div
                className="group relative aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-xl bg-surface-muted shadow-sm ring-1 ring-border-default/50"
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {isOfficial ? (
                  <span className="absolute left-4 top-4 bg-brand-accent px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-brand-accent-foreground rounded-sm shadow-lg">
                    Official
                  </span>
                ) : null}
                {img.likes_count > 0 ? (
                  <span className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[11px] font-bold text-white drop-shadow-md">
                    <Heart className="h-3.5 w-3.5 fill-brand-accent text-brand-accent" aria-hidden />
                    {img.likes_count}
                  </span>
                ) : null}
              </div>
              {(preview || authorAttribution) ? (
                <div className="px-1">
                  {authorAttribution}
                  {preview ? (
                    <Link
                      to={`/review/${block.entryId}`}
                      className={cn("group/r block", authorAttribution ? "mt-4" : "mb-2")}
                    >
                      <p className="text-base font-serif italic leading-relaxed text-text-secondary transition-colors group-hover/r:text-text-primary">
                        &ldquo;{preview}&rdquo;
                      </p>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        }

        // ── Orphans only below: entry-backed reviews use DetailCard A/B/C ─────

        // ── A: Single image, no text — height scales with likes ───────────────
        case "image-only": {
          const img = images[0];
          if (!img) return null;
          const isTall = topLikes >= 10;
          return (
            <div key={block.key} className="group space-y-3">
              <div
                className={cn(
                  "relative w-full cursor-pointer overflow-hidden rounded-xl bg-surface-muted shadow-sm ring-1 ring-border-default/50",
                  isTall ? "aspect-[4/5]" : "aspect-[3/2]",
                )}
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {img.likes_count > 0 ? (
                  <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-white">
                    <Heart className="h-3 w-3 fill-white" aria-hidden />
                    {img.likes_count}
                  </span>
                ) : null}
              </div>
              {authorAttribution ? <div className="px-1">{authorAttribution}</div> : null}
            </div>
          );
        }

        default:
          return null;
      }
    },
    [
      setSelectedImage,
      likedImageIds,
      entries,
      buildingSummaryForFeed,
      displayImageById,
    ],
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

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────

  const primaryCredit = visiblePrimaryCredits(buildingCredits)[0] ?? null;
  const primaryName = primaryCredit?.person?.name ?? primaryCredit?.company?.name ?? null;
  const heroAlt = [
    building.name,
    primaryName ? `by ${primaryName}` : null,
    building.year_completed ? `(${building.year_completed})` : null,
    building.city && building.country ? `— ${building.city}, ${building.country}` : null,
  ].filter(Boolean).join(" ");

  return (
    <AppLayout title={building.name} showBack showHeader>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative min-h-screen bg-surface-default"
      >
        {/* ── HERO SECTION ── */}
        <div className="relative">
          <BuildingHero key={heroImageUrl} src={heroImageUrl} alt={heroAlt}>
            <div className="max-w-screen-xl mx-auto w-full">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="space-y-4 pb-4 sm:pb-8"
              >
                {building.tier_rank && (
                  <span className="inline-block px-2 py-0.5 bg-brand-accent text-brand-accent-foreground text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm shadow-sm">
                    {building.tier_rank}
                  </span>
                )}
                <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-sm max-w-4xl leading-[1.1]">
                  {building.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/90 text-sm sm:text-base font-medium">
                  {primaryName && (
                    <div className="flex items-center gap-2">
                      <span className="opacity-60 font-normal">by</span>
                      <PrimaryCreditsLinks
                        credits={buildingCredits}
                        linkClassName="text-white hover:text-brand-accent transition-colors underline-offset-4 hover:underline decoration-white/30"
                      />
                    </div>
                  )}
                  {building.year_completed && (
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-white/40" />
                      <span>{building.year_completed}</span>
                    </div>
                  )}
                  {building.city && (
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-white/40" />
                      <span>{building.city}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </BuildingHero>
        </div>

        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* ── LEFT COLUMN: Content & Stream ── */}
            <div className="lg:col-span-8 space-y-16">
              
              {/* Architect Statement */}
              {building.architect_statement && (
                <section className="relative">
                  <div className="absolute -left-6 top-0 bottom-0 w-1 bg-brand-accent/30 rounded-full hidden md:block" />
                  <ArchitectStatement
                    statement={building.architect_statement}
                    isEditing={false}
                    onChange={() => {}}
                    architectName={leadAttributionFromCredits(buildingCredits)}
                  />
                </section>
              )}

              {/* Status Alert */}
              {(building.status === "Lost" ||
                building.status === "Unbuilt" ||
                building.status === "Under Construction") ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-lg bg-feedback-destructive/5 border border-feedback-destructive/20 flex items-start gap-4"
                >
                  <div className="mt-1 p-2 bg-feedback-destructive/10 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-feedback-destructive" />
                  </div>
                  <div>
                    <h4 className="font-bold text-feedback-destructive uppercase tracking-wider text-xs mb-1">
                      {building.status}
                    </h4>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {building.status === "Lost"
                        ? "This building is lost to time. It no longer stands at this location."
                        : building.status === "Unbuilt"
                        ? "This project was never built and exists only in records."
                        : "This building is currently under construction."}
                    </p>
                  </div>
                </motion.div>
              ) : null}

              {/* ── EDITORIAL PHOTO + REVIEW STREAM ── */}
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-border-default pb-4">
                  <h3 className="font-display text-2xl font-bold tracking-tight">Community</h3>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
                      onClick={() => document.getElementById("hidden-file-input")?.click()}
                    >
                      <Plus className="h-3 w-3" /> Upload
                    </button>
                    <input
                      id="hidden-file-input"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Link
                      to={getBuildingUrl(building.id, building.slug, building.short_id) + "/review"}
                      className="text-[10px] font-bold uppercase tracking-widest bg-text-primary text-white px-3 py-1.5 rounded-sm hover:bg-brand-primary-hover transition-colors"
                    >
                      Add Review
                    </Link>
                  </div>
                </div>

                <WidgetErrorBoundary>
                  {streamBlocks.length > 0 ? (
                    <div className="space-y-12">
                      {streamBlocks.map((block) => (
                        <motion.div
                          key={block.key}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-50px" }}
                          transition={{ duration: 0.5 }}
                        >
                          {renderStreamBlock(block)}
                        </motion.div>
                      ))}
                    </div>
                  ) : activityOnlyFeedReviews.length === 0 ? (
                    <div className="flex aspect-video flex-col items-center justify-center bg-surface-muted/30 rounded-xl border border-dashed border-border-strong/30 p-12 text-center">
                      <ImageIcon className="mb-4 h-12 w-12 text-text-disabled opacity-30" />
                      <h4 className="text-lg font-medium text-text-primary mb-2">No photos yet</h4>
                      <p className="text-sm text-text-secondary max-w-xs mb-6">
                        Be the first to capture this architectural masterpiece and share it with the community.
                      </p>
                    </div>
                  ) : null}

                  {activityOnlyFeedReviews.length > 0 && (
                    <div className="mt-16 pt-8 border-t border-border-default">
                      <h4 className="font-display text-xl font-bold mb-6">Recent Activity</h4>
                      <ActivityStreamGroup entries={activityOnlyFeedReviews} hideGroupLabel />
                    </div>
                  )}
                </WidgetErrorBoundary>
              </div>

              {/* Resources & Info Extended */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-16 border-t border-border-default">
                 {/* Resources */}
                 <section className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">Resources</h4>
                       {user && (
                         <button onClick={() => setShowLinkEditor(!showLinkEditor)} className="text-[10px] font-bold uppercase tracking-widest hover:text-text-primary transition-colors">
                            {showLinkEditor ? "Close" : "Add"}
                         </button>
                       )}
                    </div>
                    {topLinks.length > 0 ? (
                      <div className="divide-y divide-border-default">
                         {topLinks.map((link) => {
                           let domain = "";
                           try { domain = new URL(link.url).hostname; } catch { /* ignore */ }
                           return (
                             <div key={link.link_id} className="group py-4 flex items-center justify-between gap-4">
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                                   <div className="text-sm font-semibold truncate group-hover:text-brand-accent transition-colors">{link.title || domain}</div>
                                   <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">{domain}</div>
                                </a>
                                <div className="flex items-center gap-3">
                                   <button 
                                     onClick={(e) => { e.preventDefault(); void handleLinkLike(link.link_id); }}
                                     className={cn("flex items-center gap-1 text-[10px] font-bold", likedLinkIds.has(link.link_id) ? "text-text-primary" : "text-text-disabled")}
                                   >
                                      <Heart className={cn("h-3 w-3", likedLinkIds.has(link.link_id) && "fill-current")} />
                                      {link.like_count}
                                   </button>
                                   <ExternalLink className="h-3.5 w-3.5 text-text-disabled group-hover:text-text-primary" />
                                </div>
                             </div>
                           );
                         })}
                      </div>
                    ) : (
                      <div className="text-sm text-text-secondary italic">No external resources added.</div>
                    )}
                 </section>

                 {/* Credits & Contributors Full */}
                 <section className="space-y-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">Full Credits</h4>
                    <BuildingCredits
                      buildingId={building.id}
                      credits={buildingCredits}
                      isAuthenticated={Boolean(user)}
                      isAdmin={isCreditsAdmin}
                    />
                 </section>
              </div>

              {/* Related Buildings */}
              <div className="space-y-16 pt-16 border-t border-border-default">
                 <ClientOnly>
                    <RelatedByArchitectSection building={building} primaryCredit={primaryCredit} />
                    {building.city && <RelatedByCitySection building={building} locality={locality} />}
                 </ClientOnly>
              </div>

            </div>

            {/* ── RIGHT COLUMN: Actions & Info Bento ── */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Sticky Action Card */}
              <div className="lg:sticky lg:top-24 space-y-8">
                
                {/* Community Stats Quick View */}
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xl font-bold font-display">{visitorCount}</div>
                        <div className="text-[10px] uppercase tracking-widest text-text-secondary">Visitors</div>
                      </div>
                      {totalRatingPoints !== null && (
                        <div className="text-center">
                          <div className="text-xl font-bold font-display">{totalRatingPoints}</div>
                          <div className="text-[10px] uppercase tracking-widest text-text-secondary">Points</div>
                        </div>
                      )}
                   </div>
                   <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      {canEditOfficialData && (
                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" asChild>
                           <Link to={getBuildingUrl(building.id, building.slug, building.short_id) + "/edit"}>
                              <Pencil className="h-4 w-4" />
                           </Link>
                        </Button>
                      )}
                   </div>
                </div>

                {/* Main Action Card */}
                <div className="bg-white border border-border-default rounded-xl p-6 shadow-sm space-y-6">
                   {/* Status Selector */}
                   <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">My Status</label>
                      <div className="flex items-center justify-between">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <Button variant="outline" className="w-full justify-between h-11 px-4 text-sm font-medium hover:bg-surface-muted transition-colors">
                                  <div className="flex items-center gap-2">
                                     {userStatus === "visited" ? <Check className="h-4 w-4 text-feedback-success" /> : userStatus === "pending" ? <Bookmark className="h-4 w-4 text-brand-accent fill-current" /> : <Circle className="h-4 w-4 text-text-disabled" />}
                                     {userStatus === "visited" ? "Visited" : userStatus === "pending" ? "Saved" : "Add to list"}
                                  </div>
                                  <ChevronDown className="h-4 w-4 opacity-50" />
                               </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[240px] p-2">
                               <DropdownMenuItem className="rounded-md py-3" onSelect={() => void handleStatusChange("visited")}>
                                  <Check className="mr-3 h-4 w-4" /> 
                                  <div className="flex flex-col">
                                    <span className="font-bold text-xs uppercase tracking-wider">Visited</span>
                                    <span className="text-[10px] text-text-secondary">I've seen this in person</span>
                                  </div>
                                </DropdownMenuItem>
                               <DropdownMenuItem className="rounded-md py-3" onSelect={() => void handleStatusChange("pending")}>
                                  <Bookmark className="mr-3 h-4 w-4" /> 
                                  <div className="flex flex-col">
                                    <span className="font-bold text-xs uppercase tracking-wider">Wishlist</span>
                                    <span className="text-[10px] text-text-secondary">I want to visit this</span>
                                  </div>
                                </DropdownMenuItem>
                               <DropdownMenuItem className="rounded-md py-3" onSelect={() => void handleStatusChange("ignored")}>
                                  <EyeOff className="mr-3 h-4 w-4" /> 
                                  <div className="flex flex-col">
                                    <span className="font-bold text-xs uppercase tracking-wider">Hide</span>
                                    <span className="text-[10px] text-text-secondary">Don't show in my feed</span>
                                  </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                      </div>
                   </div>

                   {/* Rating */}
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">My Rating</label>
                        {myRating > 0 && <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">{myRating} / 3</span>}
                      </div>
                      <div 
                        className="flex items-center gap-4 p-4 bg-surface-muted rounded-lg justify-center border border-transparent hover:border-border-default transition-all"
                        onMouseEnter={() => setRatingAreaHovered(true)}
                        onMouseLeave={() => { setRatingAreaHovered(false); setHoverRating(null); }}
                      >
                         {[1, 2, 3].map((i) => {
                            const filled = hoverRating !== null ? i <= hoverRating : i <= myRating;
                            return (
                               <motion.div
                                 key={i}
                                 whileHover={{ scale: 1.25 }}
                                 whileTap={{ scale: 0.9 }}
                                 onClick={() => void handleRate(building.id, i === myRating ? 0 : i)}
                                 onMouseEnter={() => setHoverRating(i)}
                                 className="cursor-pointer"
                               >
                                  <Circle
                                    className={cn(
                                      "h-8 w-8 transition-all duration-300",
                                      filled ? "fill-brand-accent text-brand-accent drop-shadow-[0_0_8px_rgba(190,255,0,0.3)]" : "fill-transparent text-text-disabled opacity-40 hover:opacity-100"
                                    )}
                                  />
                               </motion.div>
                            );
                         })}
                      </div>
                   </div>

                   {/* Secondary Actions */}
                   <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button variant="secondary" size="sm" onClick={() => setNoteEditorOpen(!noteEditorOpen)} className="h-10 text-[10px] font-bold uppercase tracking-[0.1em] bg-surface-muted hover:bg-border-default border-none">
                         <Plus className="h-3.5 w-3.5 mr-2" /> Note
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setShowCollections(!showCollections)} className="h-10 text-[10px] font-bold uppercase tracking-[0.1em] bg-surface-muted hover:bg-border-default border-none">
                         <Plus className="h-3.5 w-3.5 mr-2" /> Collection
                      </Button>
                   </div>

                   {/* Editors */}
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
                             className="min-h-[120px] text-sm resize-none"
                           />
                           <div className="flex justify-end gap-2">
                             <Button size="sm" variant="ghost" onClick={() => setNoteEditorOpen(false)}>Cancel</Button>
                             <Button size="sm" onClick={() => void handleSaveNote()} disabled={isSavingNote}>
                                {isSavingNote && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Save Note
                             </Button>
                           </div>
                        </motion.div>
                     )}
                   </AnimatePresence>
                </div>

                {/* Map Preview Card */}
                <div className="bg-white border border-border-default rounded-xl overflow-hidden shadow-sm group/map">
                   <div className="h-48 relative overflow-hidden">
                      {coordinates ? (
                        <div className="h-full w-full grayscale-[0.5] hover:grayscale-0 transition-all duration-700">
                          <BuildingLocationMap
                            lat={coordinates.lat}
                            lng={coordinates.lng}
                            isExpanded={isMapExpanded}
                            onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                            className="h-full w-full"
                          />
                        </div>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-surface-muted text-text-disabled text-[10px] font-bold uppercase tracking-widest">
                           Location Unavailable
                        </div>
                      )}
                   </div>
                   <div className="p-4 flex items-center justify-between bg-white border-t border-border-default">
                      <div className="flex items-center gap-2 text-xs text-text-secondary font-medium min-w-0">
                         <MapPin className="h-3.5 w-3.5 text-brand-accent shrink-0" />
                         <span className="truncate">{building.city}, {building.country}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-bold uppercase tracking-widest hover:text-brand-accent transition-colors shrink-0" onClick={() => {
                        if (building.location_precision === "approximate") setShowDirectionsAlert(true);
                        else window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates?.lat},${coordinates?.lng}`, "_blank");
                      }}>
                         Directions <Navigation className="h-3 w-3 ml-1" />
                      </Button>
                   </div>
                </div>

                {/* Info Bento Grid */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white border border-border-default rounded-xl p-4 flex flex-col justify-between min-h-[100px] hover:border-border-strong transition-colors">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">Typology</label>
                      <div className="space-y-1.5">
                        {building.typology?.slice(0, 2).map(t => (
                          <div key={t} className="text-xs font-bold truncate leading-none">{t}</div>
                        )) || <div className="text-xs text-text-disabled">None</div>}
                      </div>
                   </div>
                   <div className="bg-white border border-border-default rounded-xl p-4 flex flex-col justify-between min-h-[100px] hover:border-border-strong transition-colors">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">Materials</label>
                      <div className="space-y-1.5">
                        {building.materials?.slice(0, 2).map(m => (
                          <div key={m} className="text-xs font-bold truncate leading-none">{m}</div>
                        )) || <div className="text-xs text-text-disabled">None</div>}
                      </div>
                   </div>
                   <div className="bg-white border border-border-default rounded-xl p-4 flex flex-col justify-between min-h-[100px] hover:border-border-strong transition-colors">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">Style</label>
                      <div className="space-y-1.5">
                        {building.styles?.slice(0, 2).map(s => (
                          <div key={s.id} className="text-xs font-bold truncate leading-none">{s.name}</div>
                        )) || <div className="text-xs text-text-disabled">None</div>}
                      </div>
                   </div>
                   <div className="bg-white border border-border-default rounded-xl p-4 flex flex-col justify-between min-h-[100px] hover:border-border-strong transition-colors">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">Access</label>
                      <div className="text-xs font-bold truncate leading-none">{formatCatalogLabel(building.access_level) || "Public"}</div>
                   </div>
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
              This building&apos;s location is approximate. The directions will
              guide you to the general vicinity (e.g. village center).
              <br /><br />
              Please look around when you arrive.
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