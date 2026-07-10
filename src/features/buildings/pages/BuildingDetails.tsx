import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  useParams,
  Link,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  useRevalidator,
  useSearchParams,
  useNavigate,
  type MetaFunction,
} from "react-router";
import {
  Loader2, MapPin,
  Check, Bookmark, Image as ImageIcon,
  Heart, Circle, AlertTriangle,
  EyeOff, Plus,
  Pencil, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { getBuildingUrl } from "@/utils/url";
import { getBuildingImageUrl } from "@/utils/image";
import { CollectionSelector } from "@/features/collections/components/CollectionSelector";
import { BuildingLocationMap } from "@/features/maps/components/BuildingLocationMap";
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
import { formatBuildingStatusForDisplay, isLostStatus } from "@/lib/buildingStatus";
import { cn } from "@/lib/utils";
import { useBuildingInteractions } from "@/features/buildings/hooks/useBuildingInteractions";
import {
  buildingEntryToFeedReview,
  type BuildingSummaryForFeed,
} from "@/features/buildings/utils/buildingReviewFeedAdapter";
import { ActivityStreamGroup } from "@/features/posts/components/ActivityStream";
import { ClientOnly } from "@/components/common/ClientOnly";
import { RelatedByArchitectSection, RelatedByCitySection } from "../components/RelatedBuildings";
import { BuildingHeroSection } from "../components/BuildingHeroSection";
import { BuildingHeader } from "../components/BuildingHeader";
import { BuildingMapTab } from "../components/BuildingMapTab";
import { NotePhotoGrid } from "../components/NotePhotoGrid";
import { PendingPhotosQueue } from "../components/PendingPhotosQueue";
import { BuildingInfoSection } from "../components/BuildingInfoSection";
import { BuildingInfoTab } from "../components/BuildingInfoTab";
import { StreamAuthorAttribution } from "../components/StreamAuthorAttribution";
import { PersonalRatingButton } from "../components/PersonalRatingButton";

export { buildingLoader as loader } from "./BuildingDetails.loader";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = "overview" | "media" | "info" | "credits" | "map";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "media", label: "Media" },
  { id: "info", label: "Info" },
  { id: "credits", label: "Credits" },
  { id: "map", label: "Map" },
];

/** Client-side chunks for overview editorial stream (infinite scroll). */
const OVERVIEW_STREAM_CHUNK_SIZE = 8;

// ─── Building Details Component ──────────────────────────────────────────────

export function HydrateFallback() {
  return (
    <AppLayout showBack title="Loading..." showHeader shellProvidesTopInset>
      <Skeleton className="h-56 max-h-[50vh] sm:max-h-none sm:h-64 lg:h-80 w-full rounded-none" />
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <Skeleton className="h-64 w-full rounded-none" />
            <Skeleton className="h-48 w-full rounded-none" />
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
          <Button asChild size="lg" variant="default" className="min-w-[200px] rounded-none">
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
            className="min-w-[200px] rounded-none"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
          >
            Try again
          </Button>
          <Button asChild size="lg" variant="outline" className="min-w-[200px] rounded-none">
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
  century?: number | null;
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
  size_category?: string | null;
  size_sqm?: number | null;
  height_m?: number | null;
  storeys?: number | null;
  hero_image_id: string | null;
}

export interface FeedEntry {
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
  caption?: string | null;
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

// ─── Meta ─────────────────────────────────────────────────────────────────────

/** Header bar + `<title>` base: name with optional city when known. */
function buildingDetailPageTitle(
  building: Pick<BuildingDetails, "name" | "city">,
): string {
  const city =
    typeof building.city === "string" ? building.city.trim() : "";
  return city.length > 0 ? `${building.name}, ${city}` : building.name;
}

function buildingDetailDocumentTitle(
  building: Pick<BuildingDetails, "name" | "city">,
): string {
  return `${buildingDetailPageTitle(building)} | Plano`;
}

export const meta: MetaFunction<typeof buildingLoader> = ({ loaderData: data }) => {
  if (!data || !data.building) return [{ title: "Plano" }];
  const { building: rawBuilding, heroImageUrl, buildingCredits = [], locality } = data;
  const building = rawBuilding as BuildingDetails;
  const description = buildingDescription(building, buildingCredits);
  const image = heroImageUrl ?? `${SITE_URL}/cover.jpg`;
  const localityForBreadcrumb = locality && building.city && building.country
    ? { country_code: locality.country_code, city_slug: locality.city_slug, city: building.city, country: building.country }
    : null;
  const canonical = buildingCanonicalUrl(building, localityForBreadcrumb);
  const docTitle = buildingDetailDocumentTitle(building);
  return [
    { title: docTitle },
    { name: "description", content: description },
    { property: "og:title", content: docTitle },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: "Plano" },
    { property: "og:type", content: "place" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: docTitle },
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

// ─── Page component ───────────────────────────────────────────────────────────

export default function BuildingDetails() {
  const navigate = useNavigate();
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
    entries,
    displayImages,
    selectedImage,
    setSelectedImage,
    likedImageIds,
    selectedIndex,
    topLinks,
    likedLinkIds,
    userLinks: _userLinks,
    showLinkEditor,
    setShowLinkEditor,
    newLinkUrl,
    setNewLinkUrl,
    newLinkTitle,
    setNewLinkTitle,
    note,
    setNote,
    activePostId,
    userPosts,
    pendingImages,
    isSavingNote,
    showCollections,
    setShowCollections,
    selectedCollectionIds,
    setSelectedCollectionIds,
    noteEditorOpen,
    setNoteEditorOpen,
    showDeleteAlert,
    setShowDeleteAlert,
    deleteWarningMessage,
    totalRatingPoints,
    visitorCount,
    coordinates,
    accessSynthesis: _accessSynthesis,
    accessBadgeVariant: _accessBadgeVariant,
    canEditOfficialData,
    isCreditsAdmin,
    handleStatusChange,
    handleRate,
    handleImageSelect,
    removePendingImage,
    clearPendingImages,
    handleAddLink,
    handleRemoveLink: _handleRemoveLink,
    handleSaveNote,
    handleNewNote,
    handleDelete,
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
      setSearchParams(id === "overview" ? {} : { tab: id }, { replace: true, preventScrollReset: true });
    },
    [setSearchParams],
  );

  const [addCreditOpen, setAddCreditOpen] = useState(false);

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

  // Shared file input for attaching photos to the active note draft. Always
  // mounted so refs from the note editor and Media-tab shortcuts stay valid
  // regardless of which tab is currently rendered.
  const notePhotoInputRef = useRef<HTMLInputElement>(null);
  const openNotePhotoPicker = useCallback(() => {
    notePhotoInputRef.current?.click();
  }, []);
  /** Media-tab shortcut: jump to Overview, open a fresh note draft, prompt for photos. */
  const startNoteWithPhotos = useCallback(() => {
    setTab("overview");
    handleNewNote();
    notePhotoInputRef.current?.click();
  }, [setTab, handleNewNote]);

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

  const [visibleOverviewStreamCount, setVisibleOverviewStreamCount] = useState(
    OVERVIEW_STREAM_CHUNK_SIZE,
  );
  const overviewStreamSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleOverviewStreamCount(OVERVIEW_STREAM_CHUNK_SIZE);
  }, [building?.id, entries.length, displayImages.length]);

  useEffect(() => {
    if (activeTab !== "overview") return;
    const el = overviewStreamSentinelRef.current;
    if (!el) return;
    const len = streamBlocks.length;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleOverviewStreamCount((n) =>
          n >= len ? n : Math.min(n + OVERVIEW_STREAM_CHUNK_SIZE, len),
        );
      },
      { root: null, rootMargin: "320px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, streamBlocks.length, visibleOverviewStreamCount]);

  const visibleOverviewBlocks = useMemo(
    () => streamBlocks.slice(0, visibleOverviewStreamCount),
    [streamBlocks, visibleOverviewStreamCount],
  );

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
          <div key={block.key} className="space-y-4 border-b border-border-default pb-10">
            <div
              className="group relative aspect-16/10 cursor-pointer overflow-hidden bg-surface-muted"
              onClick={() => setSelectedImage(img)}
            >
              <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300" />
              {isOfficial && (
                <span className="absolute left-4 top-4 bg-text-primary px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-text-inverse rounded-none">
                  Official
                </span>
              )}
              {img.likes_count > 0 && (
                <span className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[11px] font-bold text-white drop-shadow-md">
                  <Heart className="h-3.5 w-3.5 fill-white text-white" aria-hidden />
                  {img.likes_count}
                </span>
              )}
            </div>
            {(preview || authorAttribution) && (
              <div className="pt-4 space-y-3">
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
          <div key={block.key} className="space-y-4 border-b border-border-default pb-10">
            <div className={cn("grid gap-px bg-border-default", images.length >= 4 ? "grid-cols-2" : "grid-cols-2")}>
              {images.slice(0, 4).map((img, i) => (
                <div
                  key={img.id}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden bg-surface-muted",
                    images.length === 3 && i === 0 ? "col-span-2 aspect-2/1" : "aspect-square",
                  )}
                  onClick={() => setSelectedImage(img)}
                >
                  <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {img.likes_count > 0 && (
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-sm">
                      <Heart className="h-2.5 w-2.5 fill-white" aria-hidden />
                      {img.likes_count}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {(preview || authorAttribution) && (
              <div className="pt-4 space-y-3">
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
          <div key={block.key} className="space-y-4 border-b border-border-default pb-10">
            <div
              className="group relative aspect-4/3 cursor-pointer overflow-hidden bg-surface-muted"
              onClick={() => setSelectedImage(img)}
            >
              <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {img.likes_count > 0 && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-white drop-shadow-sm">
                  <Heart className="h-3 w-3 fill-white" aria-hidden />
                  {img.likes_count}
                </span>
              )}
            </div>
            <div className="pt-4 space-y-3">
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
          <div key={block.key} className="group space-y-4 border-b border-border-default pb-10">
            <div
              className={cn(
                "relative cursor-pointer overflow-hidden bg-surface-muted",
                isTall ? "aspect-4/5" : "aspect-4/3",
              )}
              onClick={() => setSelectedImage(img)}
            >
              <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300" />
              {img.likes_count > 0 && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-white">
                  <Heart className="h-3 w-3 fill-white" aria-hidden />
                  {img.likes_count}
                </span>
              )}
            </div>
            {authorAttribution && <div className="pt-4">{authorAttribution}</div>}
          </div>
        );
      }

      if (blockType === "text-only") {
        if (!preview) return null;
        return (
          <div key={block.key} className="space-y-3 border-b border-border-default pb-10">
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
    isLostStatus(building.status) ||
    building.status === "Unbuilt" ||
    building.status === "Under Construction";

  const buildingUrl = getBuildingUrl(building.id, building.slug, building.short_id);

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────

  return (
    <AppLayout
      title={buildingDetailPageTitle(building)}
      showBack
      showHeader
      shellProvidesTopInset
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-surface-default [&_button]:rounded-none! [&_input]:rounded-none! [&_textarea]:rounded-none!"
      >
        {/* Hidden file input for attaching photos to the active note draft. */}
        <input
          ref={notePhotoInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* ── HERO — cropped colour band with identity overlaid ── */}
        <BuildingHeroSection
          building={building}
          buildingCredits={buildingCredits}
          isStatusBuilding={isStatusBuilding}
          heroImageUrl={heroImageUrl}
          alt={heroAlt}
        />

        {/* ── STATS + ACTIONS BAR ── */}
        <BuildingHeader
          visitorCount={visitorCount}
          totalRatingPoints={totalRatingPoints}
          buildingUrl={buildingUrl}
        />
        {/* Sentinel — sticky tab bar triggers when this leaves viewport */}
        <div ref={sentinelRef} aria-hidden className="h-0" />

        {/* ── TAB BAR ── */}
        <div
          className={cn(
            "border-b border-border-default bg-surface-default transition-shadow duration-200",
            isTabBarSticky && "sticky top-0 z-30 shadow-xs",
          )}
        >
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center -mb-px overflow-x-scroll-touch">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTab(tab.id)}
                    className={cn(
                      "px-5 py-3.5 text-[12px] font-medium uppercase tracking-widest border-b-2 shrink-0 transition-colors duration-150 whitespace-nowrap",
                      activeTab === tab.id
                        ? "border-text-primary text-text-primary"
                        : "border-transparent text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {activeTab === "credits" && user && (
                <button
                  type="button"
                  className="cta-link shrink-0"
                  onClick={() => setAddCreditOpen(true)}
                >
                  Add credits
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <div className={cn(
          activeTab === "map" ? "" : "max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-16",
        )}>
          <div className={cn(
            activeTab !== "map" && "grid grid-cols-1 lg:grid-cols-12 gap-12",
          )}>

            {/* ── MAIN CONTENT COLUMN ── */}
            <div className={cn(
              activeTab !== "map" && "lg:col-span-8",
              "min-w-0",
            )}>

              {/* ════ MAP TAB ════ */}
              {activeTab === "map" && (
                coordinates ? (
                  <BuildingMapTab
                    lat={coordinates.lat}
                    lng={coordinates.lng}
                    buildingId={building.id}
                    buildingName={building.name}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 text-text-secondary text-sm">
                    Location data not available for this building.
                  </div>
                )
              )}

              {/* ════ OVERVIEW TAB ════ */}
              {activeTab === "overview" && (
                <div className="space-y-12">

                  {/* Status alert */}
                  {isStatusBuilding && (
                    <div className="flex items-start gap-4 p-5 rounded-none bg-feedback-destructive/5 border border-feedback-destructive/20">
                      <AlertTriangle className="h-5 w-5 text-feedback-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-feedback-destructive uppercase tracking-wider mb-1">
                          {formatBuildingStatusForDisplay(building.status!)}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {isLostStatus(building.status)
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
                    <section>
                      <div className="mb-6 flex items-baseline gap-3 border-b border-text-primary pb-2">
                        <span className="font-mono text-[11px] tracking-[0.06em] text-text-disabled">
                          § 01
                        </span>
                        <span className="text-[11px] font-medium uppercase tracking-widest text-text-primary">
                          Architect statement
                        </span>
                      </div>
                      <ArchitectStatement
                        statement={building.architect_statement}
                        isEditing={false}
                        onChange={() => {}}
                        architectName={leadAttributionFromCredits(buildingCredits)}
                      />
                    </section>
                  )}

                  {/* Editorial stream — full list, infinite scroll (client-chunked) */}
                  <section className="space-y-10">
                    {streamBlocks.length > 0 ? (
                      <>
                        {visibleOverviewBlocks.map((block) => (
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
                        {visibleOverviewStreamCount < streamBlocks.length ? (
                          <div
                            ref={overviewStreamSentinelRef}
                            className="h-8 w-full shrink-0"
                            aria-hidden
                          />
                        ) : null}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 bg-surface-muted/30 rounded-none border border-dashed border-border-strong/30 text-center">
                        <ImageIcon className="h-10 w-10 text-text-disabled opacity-25 mb-3" />
                        <p className="text-sm font-medium text-text-primary mb-1">No photos yet</p>
                        <p className="text-xs text-text-secondary max-w-xs mb-5">
                          Be the first to share this building with the community.
                        </p>
                        <Button size="sm" variant="outline" onClick={startNoteWithPhotos}>
                          Add Note
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
                        onClick={startNoteWithPhotos}
                      >
                        <Plus className="h-3 w-3" /> Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTab("overview");
                          handleNewNote();
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest bg-text-primary text-white px-3 py-1.5 rounded-none hover:opacity-80 transition-opacity"
                      >
                        Add Note
                      </button>
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
                            className="group relative mb-3 break-inside-avoid cursor-pointer overflow-hidden rounded-none bg-surface-muted"
                            onClick={() => setSelectedImage(img)}
                          >
                            {img.type === "video" ? (
                              <div className="aspect-video flex items-center justify-center bg-surface-muted">
                                <div className="h-10 w-10 flex items-center justify-center rounded-none bg-black/50">
                                  <div className="border-l-14 border-l-white border-y-8 border-y-transparent ml-1" />
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
                              <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-sm">
                                <Heart className="h-2.5 w-2.5 fill-white" aria-hidden />
                                {img.likes_count}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 bg-surface-muted/30 rounded-none border border-dashed border-border-strong/30 text-center">
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
                            onClick={startNoteWithPhotos}
                          >
                            Upload Photo
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setTab("overview");
                              handleNewNote();
                            }}
                          >
                            Write Note
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
                        <ActivityStreamGroup
                          entries={activityOnlyFeedReviews}
                          hideGroupLabel
                          squareAvatars
                        />
                      </div>
                    )}
                  </WidgetErrorBoundary>
                </div>
              )}

              {/* ════ INFO TAB ════ */}
              {activeTab === "info" && (
                <BuildingInfoTab
                  building={building}
                  buildingCredits={buildingCredits}
                  topLinks={topLinks}
                  user={user}
                  showLinkEditor={showLinkEditor}
                  setShowLinkEditor={setShowLinkEditor}
                  newLinkUrl={newLinkUrl}
                  setNewLinkUrl={setNewLinkUrl}
                  newLinkTitle={newLinkTitle}
                  setNewLinkTitle={setNewLinkTitle}
                  handleAddLink={handleAddLink}
                  handleLinkLike={handleLinkLike}
                  likedLinkIds={likedLinkIds}
                />
              )}

              {/* ════ CREDITS TAB ════ */}
              {activeTab === "credits" && (
                <div className="space-y-16 lg:space-y-20">
                  <BuildingCredits
                    buildingId={building.id}
                    buildingName={building.name}
                    credits={buildingCredits}
                    isAuthenticated={Boolean(user)}
                    isAdmin={isCreditsAdmin}
                    currentUserId={user?.id ?? null}
                    addOpen={addCreditOpen}
                    onAddOpenChange={setAddCreditOpen}
                  />
                </div>
              )}

            </div>

            {/* ── SIDEBAR — Right Column ── */}
            {activeTab !== "map" && <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-14 space-y-5">

                {/* Action card */}
                <div className="bg-surface-card border border-border-default rounded-none p-5 shadow-xs space-y-5">

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                      My Status
                    </label>
                    {userStatus === "ignored" ? (
                      <div className="flex items-center gap-2 h-10 px-3 border border-border-default bg-surface-muted text-sm font-medium text-text-disabled">
                        <EyeOff className="h-4 w-4 shrink-0" />
                        <span>Hidden</span>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="accent"
                            className="w-full justify-between h-10 px-3 text-sm font-medium"
                          >
                            <div className="flex items-center gap-2">
                              {userStatus === "visited" ? (
                                <Check className="h-4 w-4 text-feedback-success" />
                              ) : userStatus === "pending" ? (
                                <Bookmark className="h-4 w-4 text-text-primary fill-current" />
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
                        <DropdownMenuContent align="end" className="w-[220px] p-2 rounded-none">
                          <DropdownMenuItem
                            className="rounded-none py-2.5"
                            onSelect={() => void handleStatusChange("visited")}
                          >
                            <Check className="mr-3 h-4 w-4 shrink-0" />
                            <div>
                              <p className="font-bold text-xs uppercase tracking-wider">Visited</p>
                              <p className="text-[10px] text-text-secondary">I've seen this in person</p>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-none py-2.5"
                            onSelect={() => void handleStatusChange("pending")}
                          >
                            <Bookmark className="mr-3 h-4 w-4 shrink-0" />
                            <div>
                              <p className="font-bold text-xs uppercase tracking-wider">Wishlist</p>
                              <p className="text-[10px] text-text-secondary">I want to visit this</p>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-none py-2.5"
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
                    )}
                  </div>

                  {userStatus === "ignored" ? (
                    <div className="space-y-3">
                      <p className="text-xs text-text-secondary leading-relaxed">
                        This building is hidden. It won&apos;t appear on the map or be suggested to you.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-[10px] font-bold uppercase tracking-wider"
                        onClick={() => void handleStatusChange("ignored")}
                      >
                        Unhide
                      </Button>
                    </div>
                  ) : (
                  <>

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
                    <PersonalRatingButton
                      variant="inline"
                      buildingId={building.id}
                      initialRating={myRating}
                      onRate={handleRate}
                    />
                  </div>

                  {/* Secondary actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleNewNote}
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

                  {/* Existing notes list */}
                  <AnimatePresence>
                    {!noteEditorOpen && userPosts.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pt-1"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                            My Notes
                          </span>
                          {userPosts.length > 1 && (
                            <span className="text-[10px] font-bold text-text-disabled bg-surface-muted px-1.5 py-0.5 rounded-full">
                              {userPosts.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-3">
                          {userPosts.map((post, idx) => {
                            const preview = post.body?.trim()
                              ? post.body.length > 100 ? post.body.slice(0, 100) + "…" : post.body
                              : null;
                            const dateStr = new Date(post.updated_at || post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                            const thumbs = post.images.slice(0, 4);

                            const handleNoteImageClick = (img: typeof post.images[0]) => {
                              const url = getBuildingImageUrl(img.storage_path);
                              if (!url) return;

                              setSelectedImage({
                                id: img.id,
                                url: url,
                                type: "image",
                                likes_count: 0,
                                created_at: post.created_at,
                                user: {
                                  username: profile?.username || user?.email || "Me",
                                  avatar_url: profile?.avatar_url || null,
                                },
                                caption: post.title || post.body || null,
                              });
                            };

                            return (
                              <div
                                key={post.id}
                                className="border border-border-default bg-surface-muted/30 group/note overflow-hidden transition-all duration-200 hover:border-border-strong hover:bg-surface-muted/50 cursor-pointer"
                                onClick={() => void navigate(`/building/${building.id}/note/${post.id}/edit`)}
                              >
                                {/* Card header */}
                                <div className="flex items-center justify-between px-3 py-2 border-b border-border-default bg-surface-muted/20">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] font-bold text-text-secondary tracking-tight uppercase">
                                      {dateStr}
                                    </span>
                                    {userPosts.length > 1 && (
                                      <span className="text-[9px] font-medium text-text-disabled bg-surface-default/50 px-1 border border-border-default/50">
                                        {idx + 1}/{userPosts.length}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void navigate(`/building/${building.id}/note/${post.id}/edit`);
                                    }}
                                    className="shrink-0 p-1.5 rounded-none hover:bg-surface-default transition-colors opacity-40 group-hover/note:opacity-100"
                                    title="Edit this note"
                                  >
                                    <Pencil className="h-3 w-3 text-text-primary" />
                                  </button>
                                </div>

                                {/* Dynamic Photo Grid */}
                                <NotePhotoGrid
                                  images={thumbs}
                                  totalCount={post.images.length}
                                  onImageClick={handleNoteImageClick}
                                />

                                {/* Body */}
                                <div className="px-3.5 py-3">
                                  {post.title?.trim() && (
                                    <p className="text-xs font-bold text-text-primary leading-snug mb-1.5">{post.title}</p>
                                  )}
                                  {preview ? (
                                    <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3">
                                      {preview}
                                    </p>
                                  ) : (
                                    !post.title?.trim() && (
                                      <p className="text-[11px] text-text-disabled italic font-serif">Empty note</p>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Note editor */}
                  <AnimatePresence>
                    {noteEditorOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-3 pt-4 border-t border-border-default"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-disabled">
                            {activePostId ? "Editing note" : "New note"}
                          </span>
                          {userPosts.length > 0 && !activePostId && (
                            <span className="text-[10px] text-text-disabled">
                              {userPosts.length} existing note{userPosts.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
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
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={openNotePhotoPicker}
                            disabled={isSavingNote}
                            className="text-xs font-medium text-text-secondary hover:text-text-primary"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {pendingImages.length > 0 ? "Add more photos" : "Add photos"}
                          </Button>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                clearPendingImages();
                                setNoteEditorOpen(false);
                              }}
                            >
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
                          userId={user?.id ?? ""}
                          selectedCollectionIds={selectedCollectionIds}
                          onChange={setSelectedCollectionIds}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  </>
                  )}

                </div>

                {/* Map card */}
                <div className="bg-surface-card border border-border-default rounded-none overflow-hidden shadow-xs">
                  <div className="aspect-square relative">
                    {coordinates ? (
                      <div className={cn("h-full w-full transition-all duration-700", !isMapExpanded && "grayscale-[0.4] hover:grayscale-0")}>
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
                    <button
                      type="button"
                      className="cta-link shrink-0"
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
                      Directions
                    </button>
                  </div>
                </div>

                {/* Overview sidebar: credits preview */}
                {activeTab === "overview" && buildingCredits.length > 0 && (
                  <div className="bg-surface-card border border-border-default rounded-none p-5 shadow-xs">
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
                      isAuthenticated={Boolean(user)}
                    />
                  </div>
                )}

                {/* Credits tab sidebar: contributors */}
                {activeTab === "credits" && (
                  <div
                    id="contributors"
                    className="scroll-mt-24 rounded-none border border-border-default bg-surface-card p-5 shadow-xs"
                  >
                    <h4 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-text-secondary">
                      Page contributors
                    </h4>
                    <p className="mb-3 text-xs leading-relaxed text-text-secondary">
                      People who added photos, credits, or edits to this listing.
                    </p>
                    <BuildingContributorsInline buildingId={building.id} />
                  </div>
                )}

                {/* Building info — hidden on info tab (shown in main content there) */}
                {activeTab !== "info" && (
                  <div className="bg-surface-card border border-border-default rounded-none p-5 shadow-xs">
                    <BuildingInfoSection
                      building={building}
                      buildingCredits={buildingCredits}
                      canEdit={canEditOfficialData}
                    />
                  </div>
                )}

              </div>
            </div>}

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
        caption={selectedImage?.caption}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="rounded-none [&_button]:rounded-none">
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
        <AlertDialogContent className="rounded-none [&_button]:rounded-none">
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
              {isLostStatus(building.status) ? "Navigate to Site" : "Get Directions"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
