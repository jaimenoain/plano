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
  type MetaFunction,
} from "react-router";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
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
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";
import { ImageDetailsDialog } from "../components/ImageDetailsDialog";
import {
  buildingCreditsQueryKey,
  getBuildingCredits,
} from "@/features/credits/api/credits";
import { visiblePrimaryCredits } from "@/features/credits/buildingCreditDisplay";
import { getBuildingUrl } from "@/utils/url";
import { BuildingCredits, BuildingCreditsPreview } from "../components/BuildingCredits";
import { BuildingMapCard } from "../components/BuildingMapCard";
import { BuildingContributorsInline } from "../components/BuildingContributorsInline";
import { buildingLoader } from "./BuildingDetails.loader";
import {
  buildingCanonicalUrl,
  buildingStructuredData,
  buildingBreadcrumbStructuredData,
  buildingDescription,
  SITE_URL,
} from "@/features/buildings/utils/structuredData";
import { isLostStatus } from "@/lib/buildingStatus";
import { cn } from "@/lib/utils";
import { useBuildingInteractions } from "@/features/buildings/hooks/useBuildingInteractions";
import {
  buildingEntryToFeedReview,
  type BuildingSummaryForFeed,
} from "@/features/buildings/utils/buildingReviewFeedAdapter";
import { ActivityStreamGroup } from "@/features/posts/components/ActivityStream";
import { BuildingHeroSection } from "../components/BuildingHeroSection";
import { BuildingMasthead } from "../components/BuildingMasthead";
import { BuildingFactsStrip } from "../components/BuildingFactsStrip";
import { BuildingMapTab } from "../components/BuildingMapTab";
import { BuildingMediaTab } from "../components/BuildingMediaTab";
import { BuildingInfoSection } from "../components/BuildingInfoSection";
import { BuildingInfoTab } from "../components/BuildingInfoTab";
import { BuildingOverviewTab } from "../components/BuildingOverviewTab";
import { BuildingActionCard } from "../components/BuildingActionCard";
import { StreamBlockView } from "../components/BuildingStreamBlocks";
import { buildStreamBlocks } from "../utils/streamBlocks";

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
    hasMoreCommunity,
    loadMoreCommunity,
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
  const [showDirectionsAlert, setShowDirectionsAlert] = useState(false);

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

  const streamBlocks = useMemo(
    () => buildStreamBlocks(entries, displayImages, displayImageById),
    [entries, displayImages, displayImageById],
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

  // Photographer credit chip for the hero band; hidden when the hero URL has
  // no match in the community images (e.g. preview-fallback heroes).
  const heroDisplayImage = heroImageUrl
    ? displayImages.find((img) => img.url === heroImageUrl) ?? null
    : null;
  const heroCredit = heroDisplayImage
    ? {
        isOfficial: !!heroDisplayImage.is_official,
        username: heroDisplayImage.user?.username ?? null,
      }
    : null;

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

        {/* ── PHOTO BAND — clean cropped photograph, credit chip only ── */}
        <BuildingHeroSection
          heroImageUrl={heroImageUrl}
          alt={heroAlt}
          heroCredit={heroCredit}
        />

        {/* ── EDITORIAL MASTHEAD — identity + stats/actions below the photo ── */}
        <BuildingMasthead
          building={building}
          buildingCredits={buildingCredits}
          isStatusBuilding={isStatusBuilding}
          visitorCount={visitorCount}
          totalRatingPoints={totalRatingPoints}
          buildingUrl={buildingUrl}
        />

        {/* ── FACTS STRIP — key facts, visible across all tabs ── */}
        <BuildingFactsStrip building={building} coordinates={coordinates} />

        {/* Sentinel — sticky tab bar triggers when this leaves viewport */}
        <div ref={sentinelRef} aria-hidden className="h-0 mt-10 md:mt-12" />

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
                      "cursor-pointer px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.15em] border-b-2 shrink-0 transition-colors duration-150 whitespace-nowrap",
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
                <BuildingOverviewTab
                  building={building}
                  buildingCredits={buildingCredits}
                  primaryCredit={primaryCredit}
                  locality={locality}
                  streamBlocks={streamBlocks}
                  isStatusBuilding={isStatusBuilding}
                  hasMoreCommunity={hasMoreCommunity}
                  loadMoreCommunity={loadMoreCommunity}
                  onSelectImage={setSelectedImage}
                  onAddNote={startNoteWithPhotos}
                />
              )}

              {/* ════ MEDIA TAB ════ */}
              {activeTab === "media" && (
                <BuildingMediaTab
                  images={displayImages}
                  buildingId={building.id}
                  onSelectImage={setSelectedImage}
                  onUploadPhoto={startNoteWithPhotos}
                  onWriteNote={() => {
                    setTab("overview");
                    handleNewNote();
                  }}
                  hasMore={hasMoreCommunity}
                  onLoadMore={loadMoreCommunity}
                >
                  {/* Text-only reviews */}
                  {streamBlocks.filter((b) => b.blockType === "text-only").length > 0 && (
                    <div className="mt-8 space-y-4">
                      <h4 className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary pt-6 border-t border-border-default">
                        Reviews
                      </h4>
                      {streamBlocks
                        .filter((b) => b.blockType === "text-only")
                        .map((block) => (
                          <StreamBlockView key={block.key} block={block} variant="media" onSelectImage={setSelectedImage} />
                        ))}
                    </div>
                  )}

                  {activityOnlyFeedReviews.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border-default">
                      <h4 className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary mb-5">
                        Recent Activity
                      </h4>
                      <ActivityStreamGroup
                        entries={activityOnlyFeedReviews}
                        hideGroupLabel
                        squareAvatars
                      />
                    </div>
                  )}
                </BuildingMediaTab>
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
                <BuildingActionCard
                  building={building}
                  currentUser={user}
                  profile={profile ?? null}
                  userStatus={userStatus}
                  onStatusChange={handleStatusChange}
                  myRating={myRating}
                  onRate={handleRate}
                  onNewNote={handleNewNote}
                  userPosts={userPosts}
                  note={note}
                  setNote={setNote}
                  activePostId={activePostId}
                  noteEditorOpen={noteEditorOpen}
                  setNoteEditorOpen={setNoteEditorOpen}
                  pendingImages={pendingImages}
                  isSavingNote={isSavingNote}
                  onRemovePendingImage={removePendingImage}
                  onClearPendingImages={clearPendingImages}
                  onSaveNote={handleSaveNote}
                  onOpenNotePhotoPicker={openNotePhotoPicker}
                  showCollections={showCollections}
                  setShowCollections={setShowCollections}
                  selectedCollectionIds={selectedCollectionIds}
                  setSelectedCollectionIds={setSelectedCollectionIds}
                  onSelectImage={setSelectedImage}
                />

                {/* Map card */}
                <BuildingMapCard
                  coordinates={coordinates}
                  city={building.city}
                  country={building.country}
                  isApproximate={building.location_precision === "approximate"}
                  onDirectionsBlocked={() => setShowDirectionsAlert(true)}
                />

                {/* Overview sidebar: credits preview */}
                {activeTab === "overview" && buildingCredits.length > 0 && (
                  <div className="bg-surface-card border border-border-default rounded-none p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary">
                        Credits
                      </h4>
                      <button
                        type="button"
                        onClick={() => setTab("credits")}
                        className="cta-link text-[10px]"
                      >
                        All
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
                    className="scroll-mt-24 rounded-none border border-border-default bg-surface-card p-5"
                  >
                    <h4 className="mb-3 text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary">
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
                  <div className="bg-surface-card border border-border-default rounded-none p-5">
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
