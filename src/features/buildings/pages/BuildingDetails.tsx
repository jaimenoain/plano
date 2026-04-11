import { useEffect, useState, useMemo, useCallback, createElement } from "react";
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
  Pencil, BadgeCheck, ChevronDown,
} from "lucide-react";
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
import { getBuildingUrl } from "@/utils/url";
import { CollectionSelector } from "@/features/collections/components/CollectionSelector";
import { BuildingLocationMap } from "@/features/maps/components/BuildingLocationMap";
import { BuildingImageCard } from "../components/BuildingImageCard";
import { PrimaryCreditsLinks } from "../components/PrimaryCreditsLinks";
import { ArchitectStatement } from "../components/ArchitectStatement";
import { BuildingHero } from "../components/BuildingHero";
import { BuildingCredits, BuildingCreditsPreview } from "../components/BuildingCredits";
import { buildingLoader } from "./BuildingDetails.loader";
import {
  buildingAbsoluteUrl,
  buildingStructuredData,
  buildingDescription,
  SITE_URL,
} from "@/features/buildings/utils/structuredData";
import { cn } from "@/lib/utils";
import { useBuildingInteractions } from "@/features/buildings/hooks/useBuildingInteractions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export { buildingLoader as loader } from "./BuildingDetails.loader";

// ─── Static route exports ─────────────────────────────────────────────────────

export function HydrateFallback() {
  return (
    <AppLayout showBack title="Loading...">
      <Skeleton className="aspect-[21/9] w-full rounded-sm" />
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-3/5 max-w-lg md:h-14" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
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
              <> <span className="font-mono text-text-primary">({pathHint})</span></>
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
  const { building: rawBuilding, heroImageUrl, buildingCredits = [] } = data;
  const building = rawBuilding as BuildingDetails;
  const description = buildingDescription(building, buildingCredits);
  const image = heroImageUrl ?? `${SITE_URL}/cover.jpg`;
  const canonical = buildingAbsoluteUrl(building);
  return [
    { title: `${building.name} | Plano` },
    { name: "description", content: description },
    { property: "og:title", content: `${building.name} | Plano` },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: "Plano" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: `${building.name} | Plano` },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { tagName: "link", rel: "canonical", href: canonical },
    { "script:ld+json": buildingStructuredData(building, buildingCredits) },
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
      entries.flatMap((e) => e.images.map((img) => img.id)),
    );

    const entryBlocks = entries
      .map((entry): StreamBlock | null => {
        const images = entry.images
          .map((img) => displayImageById.get(img.id))
          .filter((img): img is DisplayImage => img != null);

        const isOfficial = images.some((img) => img.is_official);
        const topLikes = images.reduce(
          (max, img) => Math.max(max, img.likes_count),
          0,
        );
        const hasContent = !!(entry.content?.trim());
        const imageCount = images.length;

        if (imageCount === 0 && !hasContent) return null;

        const score =
          (isOfficial ? 1000 : 0) +
          topLikes * 10 +
          (hasContent ? 20 : 0) +
          (imageCount > 1 ? 15 : 0);

        let blockType: StreamBlock["blockType"];
        if (isOfficial) blockType = "featured";
        else if (imageCount >= 2) blockType = "mosaic";
        else if (imageCount === 1 && hasContent) blockType = "image-review";
        else if (imageCount === 1) blockType = "image-only";
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

  const renderStreamBlock = useCallback(
    (block: StreamBlock) => {
      const { images, content, user, rating, isOfficial, topLikes } = block;

      const preview =
        content && content.length > 220 ? content.slice(0, 220) + "…" : content;

      const authorAttribution =
        user && user.username?.trim() ? (
          <StreamAuthorAttribution user={user} rating={rating} />
        ) : null;

      switch (block.blockType) {

        // ── E: Featured — official or highest-signal ──────────────────────────
        case "featured": {
          const img = images[0];
          if (!img) return null;
          return (
            <div key={block.key} className="mb-0.5">
              <div
                className="group relative aspect-video w-full cursor-pointer overflow-hidden bg-surface-muted"
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-95"
                />
                {isOfficial ? (
                  <span className="absolute left-3 top-3 bg-surface-card/90 px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-text-primary">
                    Official
                  </span>
                ) : null}
                {img.likes_count > 0 ? (
                  <span className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-text-inverse/80">
                    <Heart className="h-3 w-3" aria-hidden />
                    {img.likes_count}
                  </span>
                ) : null}
              </div>
              {(preview || authorAttribution) ? (
                <div className="pb-1 pt-3">
                  {authorAttribution}
                  {preview ? (
                    <Link
                      to={`/review/${block.entryId}`}
                      className={cn("group/r block", authorAttribution ? "mt-3" : "mb-2")}
                    >
                      <p className="text-sm italic leading-relaxed text-text-secondary transition-colors group-hover/r:text-text-primary">
                        &ldquo;{preview}&rdquo;
                      </p>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        }

        // ── B: Image + review text, side by side (stacked on mobile) ─────────
        case "image-review": {
          const img = images[0];
          if (!img) return null;
          return (
            <div key={block.key} className="mb-0.5 grid grid-cols-1 sm:grid-cols-2">
              <div
                className="group aspect-video cursor-pointer overflow-hidden bg-surface-muted sm:aspect-[4/5]"
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                />
              </div>
              <div className="flex flex-col justify-center border-border-default px-0 pt-3 sm:border-l sm:px-6 sm:pt-0">
                {authorAttribution}
                <Link to={`/review/${block.entryId}`} className="group/r mt-2 block">
                  <p className="text-sm italic leading-relaxed text-text-secondary transition-colors group-hover/r:text-text-primary">
                    &ldquo;{preview}&rdquo;
                  </p>
                </Link>
              </div>
            </div>
          );
        }

        // ── C: Mosaic — 3fr/2fr hero + stacked secondaries ────────────────────
        case "mosaic": {
          const [first, second, third, ...rest] = images;
          return (
            <div key={block.key} className="mb-0.5">
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: "3fr 2fr", gridTemplateRows: "280px" }}
              >
                <div
                  className="group cursor-pointer overflow-hidden bg-surface-muted"
                  onClick={() => setSelectedImage(first)}
                >
                  <img
                    src={first.url}
                    alt=""
                    className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                  />
                </div>
                {(second || third) ? (
                  <div
                    className="grid gap-0.5"
                    style={{ gridTemplateRows: third ? "1fr 1fr" : "1fr" }}
                  >
                    {second ? (
                      <div
                        className="group cursor-pointer overflow-hidden bg-surface-muted"
                        onClick={() => setSelectedImage(second)}
                      >
                        <img
                          src={second.url}
                          alt=""
                          className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                        />
                      </div>
                    ) : null}
                    {third ? (
                      <div
                        className="group cursor-pointer overflow-hidden bg-surface-muted"
                        onClick={() => setSelectedImage(third)}
                      >
                        <img
                          src={third.url}
                          alt=""
                          className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {rest.length > 0 ? (
                <div className="mt-0.5 grid grid-cols-3 gap-0.5">
                  {rest.map((img) => (
                    <BuildingImageCard
                      key={img.id}
                      image={img}
                      initialIsLiked={likedImageIds.has(img.id)}
                      onOpen={() => setSelectedImage(img)}
                    />
                  ))}
                </div>
              ) : null}
              {(preview || authorAttribution) ? (
                <div className="pb-1 pt-2">
                  {authorAttribution}
                  {preview ? (
                    <Link to={`/review/${block.entryId}`} className="group/r mt-1.5 block">
                      <p className="text-sm italic leading-relaxed text-text-secondary transition-colors group-hover/r:text-text-primary">
                        &ldquo;{preview}&rdquo;
                      </p>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        }

        // ── A: Single image, no text — height scales with likes ───────────────
        case "image-only": {
          const img = images[0];
          if (!img) return null;
          const isTall = topLikes >= 10;
          return (
            <div key={block.key} className="group mb-0.5">
              <div
                className={cn(
                  "relative w-full cursor-pointer overflow-hidden bg-surface-muted",
                  isTall ? "aspect-[4/3]" : "aspect-video",
                )}
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                />
                {img.likes_count > 0 ? (
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-text-inverse/80">
                    <Heart className="h-3 w-3" aria-hidden />
                    {img.likes_count}
                  </span>
                ) : null}
              </div>
              {authorAttribution ? <div className="mt-2">{authorAttribution}</div> : null}
            </div>
          );
        }

        // ── D: Pull quote — text only, architect-of-building gets left border ──
        case "text-only": {
          if (!content) return null;
          const isArchitectOfBuilding = user?.is_architect_of_building;
          return (
            <Link
              key={block.key}
              to={`/review/${block.entryId}`}
              className={cn(
                "group block border-b border-border-default py-6",
                isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
              )}
            >
              <p className="text-base italic leading-relaxed text-text-primary transition-opacity group-hover:opacity-75">
                &ldquo;{preview}&rdquo;
              </p>
              <div className="mt-3">{authorAttribution}</div>
            </Link>
          );
        }

        default:
          return null;
      }
    },
    [setSelectedImage, likedImageIds],
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

  return (
    <AppLayout title={building.name} showBack>

      {/* ── HERO — full-bleed, no overlay, unchanged ── */}
      <BuildingHero key={heroImageUrl} src={heroImageUrl} alt={building.name} />

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* ── IDENTITY ── */}
          <div className="space-y-3 py-8">
            {building.tier_rank ? (
              <span className="block text-2xs font-medium uppercase tracking-widest text-text-secondary">
                {building.tier_rank}
                {building.city ? ` · ${building.city}` : ""}
              </span>
            ) : null}

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
              {building.name}
            </h1>

            {building.alt_name && building.alt_name !== building.name ? (
              <p className="text-lg text-text-secondary">{building.alt_name}</p>
            ) : null}

            {/* Status pill */}
            {(building.status === "Demolished" ||
              building.status === "Lost" ||
              building.status === "Unbuilt" ||
              building.status === "Under Construction") ? (
              <span className="inline-block border border-border-default px-2 py-0.5 text-2xs font-medium uppercase tracking-widest text-text-secondary">
                {building.status}
              </span>
            ) : null}

            {/* Architect · Year · City */}
            <div className="group/subtitle flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              {visiblePrimaryCredits(buildingCredits).length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-1">
                    <PrimaryCreditsLinks
                      credits={buildingCredits}
                      linkClassName="font-medium text-text-primary underline-offset-4 hover:underline"
                    />
                  </div>
                  <span className="text-text-disabled">·</span>
                </>
              ) : null}
              <span>{building.year_completed}</span>
              {(building.city || building.country) ? (
                <>
                  <span className="text-text-disabled">·</span>
                  <span>
                    {[building.city, building.country].filter(Boolean).join(", ")}
                  </span>
                </>
              ) : null}
              {canEditOfficialData ? (
                <Link
                  to={
                    getBuildingUrl(
                      building.id,
                      building.slug,
                      building.short_id,
                    ) + "/edit"
                  }
                  className="inline-flex shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-default group-hover/subtitle:opacity-100"
                  aria-label="Edit building"
                  title="Edit building"
                >
                  <Pencil className="h-3.5 w-3.5 text-text-disabled transition-colors hover:text-text-primary" />
                </Link>
              ) : null}
            </div>

            {/* Community stats */}
            {entries.length > 0 ? (
              <div className="flex items-center gap-4">
                {totalRatingPoints !== null ? (
                  <span
                    className="text-xs text-text-disabled"
                    title="Sum of all visitor ratings (each 1–3)"
                  >
                    {totalRatingPoints}{" "}
                    {totalRatingPoints === 1 ? "rating point" : "rating points"}
                  </span>
                ) : null}
                <span className="text-xs text-text-disabled">
                  {visitorCount} {visitorCount === 1 ? "visitor" : "visitors"}
                </span>
              </div>
            ) : null}
          </div>

          {/* ── USER ACTIONS ── */}
          {user && (userStatus === "visited" || userStatus === "pending") ? (
            <div className="group/actions space-y-3 border-b border-border-default pb-4">
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    type="button"
                    className="inline-flex items-center gap-0.5 text-xs font-medium uppercase tracking-widest text-text-primary outline-none transition-colors hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-border-default data-[state=open]:text-brand-primary"
                  >
                    {userStatus === "visited" ? (
                      <>
                        <Check
                          className={cn(
                            "mr-1 inline h-4 w-4",
                            "stroke-[2.5px]",
                          )}
                          aria-hidden
                        />
                        Visited
                      </>
                    ) : userStatus === "pending" ? (
                      <>
                        <Bookmark
                          className="mr-1 inline h-4 w-4 fill-current"
                          aria-hidden
                        />
                        Save
                      </>
                    ) : (
                      <>
                        <EyeOff className="mr-1 inline h-4 w-4" aria-hidden />
                        Hide
                      </>
                    )}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-40">
                    <DropdownMenuItem
                      className="text-xs font-medium uppercase tracking-widest"
                      onSelect={() => void handleStatusChange("visited")}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          userStatus === "visited" && "stroke-[2.5px]",
                        )}
                        aria-hidden
                      />
                      Visited
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs font-medium uppercase tracking-widest"
                      onSelect={() => void handleStatusChange("pending")}
                    >
                      <Bookmark
                        className={cn(
                          "mr-2 h-4 w-4",
                          userStatus === "pending" && "fill-current",
                        )}
                        aria-hidden
                      />
                      Save
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs font-medium uppercase tracking-widest"
                      onSelect={() => void handleStatusChange("ignored")}
                    >
                      <EyeOff className="mr-2 h-4 w-4" aria-hidden />
                      Hide
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div
                  className="ml-2 flex min-h-4 min-w-14 items-center gap-1"
                  onMouseEnter={() => setRatingAreaHovered(true)}
                  onMouseLeave={() => {
                    setRatingAreaHovered(false);
                    setHoverRating(null);
                  }}
                >
                  {[1, 2, 3].map((i) => {
                    const filled =
                      hoverRating !== null ? i <= hoverRating : i <= myRating;
                    const showCell =
                      hoverRating !== null || ratingAreaHovered || i <= myRating;
                    return (
                      <Circle
                        key={i}
                        className={cn(
                          "h-4 w-4 shrink-0 cursor-pointer transition-opacity hover:opacity-80",
                          !showCell && "opacity-0",
                          filled
                            ? "fill-text-primary text-text-primary"
                            : "fill-transparent text-text-disabled",
                        )}
                        onMouseEnter={() => setHoverRating(i)}
                        onClick={() =>
                          void handleRate(building.id, i === myRating ? 0 : i)
                        }
                      />
                    );
                  })}
                </div>

                <div className="min-w-0 flex-1" />

                <div
                  className={cn(
                    "flex flex-wrap items-center justify-end gap-x-3 gap-y-1 transition-opacity duration-150",
                    buildingInteractionsExpanded
                      ? "opacity-100"
                      : "max-md:opacity-100 md:opacity-0 md:group-hover/actions:opacity-100 md:focus-within:opacity-100",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setNoteEditorOpen((open) => !open)}
                    aria-expanded={noteEditorOpen}
                    className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                  >
                    <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Add note
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCollections(!showCollections)}
                    className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                  >
                    <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Add to collection
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVisitWith(!showVisitWith)}
                    className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                  >
                    <Users className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Plan a visit
                  </button>
                </div>
              </div>

              {noteEditorOpen ? (
                <div className="space-y-2">
                  <Textarea
                    id="building-status-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note or review (optional)"
                    aria-label="Add a note or review (optional)"
                    maxLength={10000}
                    rows={4}
                    className="min-h-0 resize-y"
                    disabled={isSavingNote}
                  />
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={isSavingNote}
                      className="text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary disabled:opacity-50"
                      onClick={() => {
                        void handleSaveNote();
                      }}
                    >
                      {isSavingNote ? (
                        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden />
                      ) : null}
                      Save note
                    </button>
                  </div>
                </div>
              ) : null}

              {user && pendingImages.length > 0 ? (
                <PendingPhotosQueue
                  pendingImages={pendingImages}
                  isSavingNote={isSavingNote}
                  onRemove={removePendingImage}
                  onSave={() => {
                    void handleSaveNote();
                  }}
                />
              ) : null}

              {showCollections ? (
                <CollectionSelector
                  userId={user.id}
                  selectedCollectionIds={selectedCollectionIds}
                  onChange={setSelectedCollectionIds}
                />
              ) : null}

              {showVisitWith ? (
                <div className="space-y-3">
                  <UserPicker
                    selectedIds={selectedFriends}
                    onSelect={(friendId) =>
                      setSelectedFriends((prev) =>
                        prev.includes(friendId) ? prev : [...prev, friendId],
                      )
                    }
                    onRemove={(friendId) =>
                      setSelectedFriends((prev) =>
                        prev.filter((x) => x !== friendId),
                      )
                    }
                  />
                  {selectedFriends.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleSendInvites}
                      disabled={sendingInvites}
                      className="text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary disabled:opacity-50"
                    >
                      {sendingInvites ? (
                        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="mr-1 inline h-3.5 w-3.5" />
                      )}
                      Send invite →
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center gap-3",
                "pb-8",
                "border-b border-border-default",
              )}
            >
              {userStatus === null ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange("visited")}
                    className="text-xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
                  >
                    <Check className="mr-1 inline h-4 w-4" />
                    Visited
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange("pending")}
                    className="text-xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
                  >
                    <Bookmark className="mr-1 inline h-4 w-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange("ignored")}
                    className="text-xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
                  >
                    <EyeOff className="mr-1 inline h-4 w-4" />
                    Hide
                  </button>
                </>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    type="button"
                    className="inline-flex items-center gap-0.5 text-xs font-medium uppercase tracking-widest text-text-primary outline-none transition-colors hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-border-default data-[state=open]:text-brand-primary"
                  >
                    {userStatus === "visited" ? (
                      <>
                        <Check
                          className={cn(
                            "mr-1 inline h-4 w-4",
                            "stroke-[2.5px]",
                          )}
                          aria-hidden
                        />
                        Visited
                      </>
                    ) : userStatus === "pending" ? (
                      <>
                        <Bookmark
                          className="mr-1 inline h-4 w-4 fill-current"
                          aria-hidden
                        />
                        Save
                      </>
                    ) : (
                      <>
                        <EyeOff className="mr-1 inline h-4 w-4" aria-hidden />
                        Hide
                      </>
                    )}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-40">
                    <DropdownMenuItem
                      className="text-xs font-medium uppercase tracking-widest"
                      onSelect={() => void handleStatusChange("visited")}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          userStatus === "visited" && "stroke-[2.5px]",
                        )}
                        aria-hidden
                      />
                      Visited
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs font-medium uppercase tracking-widest"
                      onSelect={() => void handleStatusChange("pending")}
                    >
                      <Bookmark
                        className={cn(
                          "mr-2 h-4 w-4",
                          userStatus === "pending" && "fill-current",
                        )}
                        aria-hidden
                      />
                      Save
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs font-medium uppercase tracking-widest"
                      onSelect={() => void handleStatusChange("ignored")}
                    >
                      <EyeOff className="mr-2 h-4 w-4" aria-hidden />
                      Hide
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="flex-1" />

              <Link
                to={
                  getBuildingUrl(building.id, building.slug, building.short_id) +
                  "/review"
                }
                className="text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary"
              >
                Write review →
              </Link>
            </div>
          )}

          {user &&
          pendingImages.length > 0 &&
          userStatus !== "visited" &&
          userStatus !== "pending" ? (
            <div className="border-b border-border-default pb-8">
              <PendingPhotosQueue
                pendingImages={pendingImages}
                isSavingNote={isSavingNote}
                onRemove={removePendingImage}
                onSave={() => {
                  void handleSaveNote();
                }}
              />
            </div>
          ) : null}

          {/* ── INFO ZONE: Credits preview (left) + Info + Map (right) ── */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 border-b border-border-default py-8 sm:grid-cols-2">

            {/* Left: compact credits preview */}
            <div>
              <h2 className="mb-4 text-[10px] font-medium uppercase tracking-widest text-text-secondary">
                Credits
              </h2>
              <BuildingCreditsPreview
                credits={buildingCredits}
                isAuthenticated={Boolean(user)}
              />
            </div>

            {/* Right: info tags + map */}
            <div>
              <div className="group/info mb-4 flex items-center justify-between gap-2">
                <h2 className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">
                  Info
                </h2>
                {canEditOfficialData ? (
                  <Link
                    to={
                      getBuildingUrl(
                        building.id,
                        building.slug,
                        building.short_id,
                      ) + "/edit"
                    }
                    className="inline-flex shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-default group-hover/info:opacity-100"
                    aria-label="Edit building"
                    title="Edit building"
                  >
                    <Pencil className="h-3.5 w-3.5 text-text-disabled transition-colors hover:text-text-primary" />
                  </Link>
                ) : null}
              </div>

              {building.styles && building.styles.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {building.styles.map((s) => (
                    <span
                      key={s.id}
                      className="border border-border-default px-2 py-0.5 text-[11px] text-text-secondary"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              ) : null}

              {building.typology && building.typology.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {building.typology.map((t) => (
                    <span
                      key={t}
                      className="border border-border-default px-2 py-0.5 text-[11px] text-text-secondary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}

              {accessSynthesis ? (
                <div className="mt-3">
                  <Badge
                    variant={accessBadgeVariant()}
                    className="flex w-fit items-center gap-1.5 text-xs"
                  >
                    {createElement(accessSynthesis.icon, { className: "w-3.5 h-3.5" })}
                    {accessSynthesis.label}
                  </Badge>
                </div>
              ) : null}

              {building.access_notes ? (
                <p className="mt-2 border-l-2 border-text-primary/20 py-0.5 pl-3 text-sm text-text-secondary">
                  {building.access_notes}
                </p>
              ) : null}

              {/* Map + location line (shared hover for edit affordance) */}
              <div className="group/location mt-4">
                {building.location_precision === "approximate" ? (
                  <Alert className="mb-3 border-amber-500/50 bg-amber-500/10 text-amber-500">
                    <AlertTriangle className="h-4 w-4 stroke-amber-500" />
                    <AlertDescription className="ml-2 text-xs">
                      Approximate location — marker shows general area.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {coordinates ? (
                  <WidgetErrorBoundary>
                    <BuildingLocationMap
                      lat={coordinates.lat}
                      lng={coordinates.lng}
                      status={userStatus}
                      rating={myRating}
                      tierRank={building.tier_rank}
                      locationPrecision={building.location_precision}
                      isExpanded={isMapExpanded}
                      onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                      className={isMapExpanded ? "" : "h-36 w-full"}
                    />
                  </WidgetErrorBoundary>
                ) : (
                  <div className="flex h-36 w-full flex-col items-center justify-center gap-2 bg-surface-muted/20 text-text-secondary">
                    <MapPin className="h-5 w-5 opacity-40" />
                    <span className="text-[10px] uppercase tracking-widest">
                      Location unavailable
                    </span>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {[building.city, building.country]
                        .filter(Boolean)
                        .join(", ") || building.address}
                    </span>
                    {canEditOfficialData ? (
                      <Link
                        to={
                          getBuildingUrl(
                            building.id,
                            building.slug,
                            building.short_id,
                          ) + "/edit"
                        }
                        className="inline-flex shrink-0 p-0.5 opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-default group-hover/location:opacity-100"
                        aria-label="Edit building"
                        title="Edit building"
                      >
                        <Pencil className="h-3 w-3 text-text-disabled transition-colors hover:text-text-primary" />
                      </Link>
                    ) : null}
                  </div>

                  {coordinates ? (
                    <button
                      type="button"
                      className="text-[10px] font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                      onClick={() => {
                        if (building.location_precision === "approximate")
                          setShowDirectionsAlert(true);
                        else
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`,
                            "_blank",
                          );
                      }}
                    >
                      {building.status === "Lost"
                        ? "Navigate to site →"
                        : "Get directions →"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* ── ARCHITECT STATEMENT ── */}
          <ArchitectStatement
            statement={building.architect_statement ?? ""}
            isEditing={false}
            onChange={() => {}}
            architectName={leadAttributionFromCredits(buildingCredits)}
          />

          {/* ── BUILDING STATUS ALERT — structural warnings only ── */}
          {(building.status === "Lost" ||
            building.status === "Unbuilt" ||
            building.status === "Under Construction") ? (
            <Alert className="border-feedback-destructive/50 bg-feedback-destructive/10 text-feedback-destructive">
              <AlertTriangle className="h-4 w-4 stroke-feedback-destructive" />
              <AlertDescription className="ml-2 font-medium">
                {building.status === "Lost"
                  ? "This building is lost to time. It no longer stands at this location."
                  : building.status === "Unbuilt"
                  ? "This project was never built."
                  : "This building is under construction."}
              </AlertDescription>
            </Alert>
          ) : null}

        </div>
      </div>

      {/* ── EDITORIAL PHOTO + REVIEW STREAM ── */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          <div className="flex items-center justify-between border-t border-border-default pb-3 pt-8">
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">
              Photos &amp; reviews
              {displayImages.length > 0 ? ` · ${displayImages.length}` : ""}
            </h2>
            <button
              type="button"
              className="text-[10px] font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
              onClick={() => document.getElementById("hidden-file-input")?.click()}
            >
              Upload →
            </button>
            <input
              id="hidden-file-input"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              aria-label="Upload photos of this building"
            />
          </div>

          {/* Stream */}
          <WidgetErrorBoundary>
            {streamBlocks.length > 0 ? (
              <div>{streamBlocks.map((block) => renderStreamBlock(block))}</div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center bg-surface-muted/20 p-6 text-center text-text-secondary">
                <ImageIcon className="mb-3 h-10 w-10 text-text-disabled" />
                <p className="mb-4 text-xs text-text-disabled">
                  Be the first to add a photo
                </p>
                <Link
                  to={
                    getBuildingUrl(building.id, building.slug, building.short_id) +
                    "/review"
                  }
                  className="text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary"
                >
                  Upload photo →
                </Link>
              </div>
            )}
          </WidgetErrorBoundary>

          <div className="mt-3 text-center">
            <a
              href={googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-text-disabled transition-colors hover:text-text-primary"
            >
              <Search className="h-3 w-3" />
              Search for photos on Google
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          </div>

          {/* ── FULL CREDITS — anchor target for "See all credits ↓" ── */}
          <section
            id="full-credits"
            className="mt-12 scroll-mt-4 border-t border-border-default"
          >
            <BuildingCredits
              buildingId={building.id}
              credits={buildingCredits}
              isAuthenticated={Boolean(user)}
              isAdmin={isCreditsAdmin}
            />
          </section>

          {/* ── RESOURCES ── */}
          {(linksLoading || topLinks.length > 0) ? (
            <section className="border-t border-border-default pt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                  Resources
                </h2>
                {user ? (
                  <button
                    type="button"
                    onClick={() => setShowLinkEditor(!showLinkEditor)}
                    className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Add →
                  </button>
                ) : null}
              </div>

              {linksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : (
                <div className="space-y-0">
                  {topLinks.map((link) => {
                    let domain = "";
                    try { domain = new URL(link.url).hostname; } catch { /* ignore */ }
                    const displayDomain = domain || link.url;
                    const hasTitle = !!link.title;
                    const isLiked = likedLinkIds.has(link.link_id);
                    return (
                      <div
                        key={link.link_id}
                        className="group flex items-center justify-between border-b border-border-default py-3"
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden"
                        >
                          <span className="truncate text-sm font-medium text-text-primary transition-colors group-hover:text-brand-primary">
                            {hasTitle ? link.title : displayDomain}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-text-disabled">
                            {hasTitle ? (
                              <span className="max-w-[150px] truncate">{displayDomain}</span>
                            ) : null}
                            {hasTitle && link.user_username ? <span>·</span> : null}
                            {link.user_username ? (
                              <span>@{link.user_username}</span>
                            ) : null}
                          </div>
                        </a>
                        <div className="ml-2 flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 text-xs transition-colors ${
                              isLiked
                                ? "text-text-primary"
                                : "text-text-disabled hover:text-text-primary"
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              void handleLinkLike(link.link_id);
                            }}
                          >
                            <Heart className={cn("h-3 w-3", isLiked && "fill-current")} />
                            <span>{link.like_count}</span>
                          </button>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-disabled transition-colors hover:text-text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}

                  {showLinkEditor && user ? (
                    <div className="space-y-2 pt-4">
                      {userLinks.length > 0 ? (
                        <ul className="space-y-1.5 text-sm text-text-secondary">
                          {userLinks.map((l) => (
                            <li key={l.id} className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate">
                                {l.title || l.url}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLink(l.id)}
                                className="text-text-disabled transition-colors hover:text-text-primary"
                                aria-label="Remove link"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <Input
                        placeholder="URL"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Title (optional)"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary"
                      >
                        Add link →
                      </button>
                      {(userLinks.length > 0 ||
                        selectedCollectionIds.length !== initialCollectionIds.length) ? (
                        <button
                          type="button"
                          disabled={isSavingNote}
                          className="mt-2 block text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary disabled:opacity-50"
                          onClick={() => { void handleSaveNote(); }}
                        >
                          {isSavingNote ? (
                            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                          ) : null}
                          Save links →
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

        </div>
      </div>

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