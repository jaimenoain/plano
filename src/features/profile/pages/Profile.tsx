/**
 * Profile.tsx — Redesigned with A24 editorial aesthetic (v2)
 *
 * Key visual changes:
 *  - Avatar is a first-class portrait photo (3:4, right column, full-bleed)
 *  - Metrics ARE the tabs — no separate stats row + tab strip
 *  - 'Visited' and 'Saved' replace the old 'log' + filter combo as first-class sections
 *  - Editorial building grid: no borders, no icons, bold name / faint meta
 *  - Photos: CSS masonry, featured items at positions 0, 7, 14…
 *  - Header: inline-editable firm name, bio, website link
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, ReactNode, useCallback } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  useRevalidator,
  Link,
  type MetaFunction,
} from "react-router";
import {
  LogOut,
  Building2,
  Bookmark,
  Loader2,
  Map as MapIcon,
  Search,
  X,
  LayoutGrid,
  Columns,
  List,
  BadgeCheck,
  Pencil,
  Check,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { ProfileReviewCard } from "@/features/profile/components/ProfileReviewCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CollectionsGrid } from "@/features/collections/components/CollectionsGrid";
import { CreateCollectionDialog } from "@/features/collections/components/CreateCollectionDialog";
import { FeedReview, WatchWithUser } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { ProfileKanbanView } from "@/features/profile/components/ProfileKanbanView";
import { handleDragEndLogic } from "@/utils/kanbanLogic";
import { ProfileListView } from "@/features/profile/components/ProfileListView";
import { profileLoader } from "./Profile.loader";
import {
  profileStructuredData,
  SITE_URL,
} from "@/features/buildings/utils/structuredData";
import { getBuildingUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import {
  visibleCreditSummariesFromEmbed,
  type BuildingCreditEmbed,
} from "@/features/credits/api/credits";
import { getClaimedPersonSummaryForProfile } from "@/features/credits/api/people";
import { profileHeaderUpdateSchema } from "@/lib/validations/profile";
import { profileLogCardImageUrl } from "@/features/profile/utils/profileLogCardImageUrl";
import { ProfileEventsSection } from "@/features/profile/components/ProfileEventsSection";

export { profileLoader as loader } from "./Profile.loader";

const PROFILE_PAGE_SELECT =
  "id, username, avatar_url, bio, favorites, last_online, verified_architect_id, firm, website" as const;

// ─── Hydrate / Error Boundaries ──────────────────────────────────────────────
export function HydrateFallback() {
  return (
    <AppLayout title="Profile" showLogo={false} showBack>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="flex gap-12 items-start">
          <div className="flex-1 space-y-5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="hidden sm:block w-44 h-56 shrink-0" />
        </div>
      </div>
    </AppLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { username } = useParams<{ username?: string }>();
  const revalidator = useRevalidator();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <AppLayout showBack title="Profile not found" showLogo={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-6">404</p>
          <h1 className="text-5xl font-bold tracking-tight text-text-primary mb-4 leading-none">
            Profile not found
          </h1>
          <p className="text-base text-text-secondary max-w-md mb-10 leading-relaxed">
            We couldn&apos;t find a profile for
            {username ? <> <span className="font-mono text-text-primary">{username}</span></> : " this URL"}.
          </p>
          <Link to="/" className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity">
            Back to home →
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack title="Error" showLogo={false}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-6">Error</p>
        <h1 className="text-5xl font-bold tracking-tight text-text-primary mb-4 leading-none">
          Something went wrong
        </h1>
        <p className="text-base text-text-secondary max-w-md mb-10 leading-relaxed">
          An unexpected error occurred while loading this profile.
        </p>
        <div className="flex items-center gap-8">
          <button
            type="button"
            className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity disabled:opacity-30"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
          >
            Try again →
          </button>
          <Link to="/" className="text-xs font-medium uppercase tracking-widest text-text-disabled hover:text-text-primary transition-colors">
            Go home →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  firm?: string | null;
  website?: string | null;
  last_online?: string | null;
  role?: string;
  verified_architect_id?: string | null;
}
interface Stats {
  reviews: number;
  pending: number;
  followers: number;
  following: number;
  photos: number;
  maps: number;
}
interface UserListItem {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_following: boolean;
  is_follower: boolean;
}
interface UserPhoto {
  id: string;
  url: string;
  building_name?: string | null;
}

// 'visited' and 'saved' replace the old 'log' + filter combo
type SectionKey = "portfolio" | "visited" | "saved" | "collections" | "photos" | "about";

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.99, transition: { duration: 0.15 } },
};
const ITEMS_PER_PAGE = 15;

// ─── Meta ─────────────────────────────────────────────────────────────────────
export const meta: MetaFunction<typeof profileLoader> = ({ data, params }) => {
  const usernameFromParams = params.username;
  if (!data || !data.profile) {
    const fallback = usernameFromParams ?? "Profile";
    return [
      { title: `${fallback} | Plano` },
      ...(data?.noIndex ? ([{ name: "robots", content: "noindex, nofollow" }] as const) : []),
    ];
  }
  const { profile } = data as { profile: Profile | null };
  if (!profile?.username) {
    const fallback = usernameFromParams ?? "Profile";
    return [{ title: `${fallback} | Plano` }];
  }
  const username = profile.username;
  const title = `${username} (@${username}) | Plano`;
  const description = profile.bio || `Check out ${username}'s reviews on Plano.`;
  const canonical = `${SITE_URL}/profile/${username}`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    { "script:ld+json": profileStructuredData({ username, avatar_url: profile.avatar_url, bio: profile.bio }) },
  ];
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user: currentUser, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { username: routeUsername } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "kanban" | "list">("grid");
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const { profile: loaderProfile } = useLoaderData<typeof profileLoader>();
  const [profile, setProfile] = useState<Profile | null>(loaderProfile as Profile | null);
  const [stats, setStats] = useState<Stats>({ reviews: 0, pending: 0, followers: 0, following: 0, photos: 0, maps: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

  // ── Inline editing state (own profile header fields) ──
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [draftFirm, setDraftFirm] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftWebsite, setDraftWebsite] = useState("");
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  // ── URL state ──
  const rawSectionParam = searchParams.get("section");
  const sectionParam = rawSectionParam as SectionKey | null;
  const legacyTabParam = searchParams.get("tab");
  const legacyFilterParam = searchParams.get("filter");
  // Backward compat: old ?tab=reviews / ?section=log&filter=visited → 'visited', etc.
  const legacySectionKey: SectionKey | null =
    legacyTabParam === "reviews" || legacyFilterParam === "visited" ? "visited"
    : legacyTabParam === "bucket_list" || legacyFilterParam === "pending" ? "saved"
    : rawSectionParam === "log" ? "visited"
    : null;

  const searchQuery = searchParams.get("search") || "";
  const [loading, setLoading] = useState(true);

  // ── Pagination ──
  const [content, setContent] = useState<FeedReview[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { containerRef, isVisible } = useIntersectionObserver();
  /** Hero on: building hero / community preview (then user photos). Hero off: only photos on the user’s review. */
  const [showCommunityImages, setShowCommunityImages] = useState(true);

  // ── Drag State ──
  const [activeId, setActiveId] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // ── Collections ──
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [collectionsRefreshKey, setCollectionsRefreshKey] = useState(0);
  const [activeCollectionData, setActiveCollectionData] = useState<{ id: string; name: string } | null>(null);

  // ── Photos tab ──
  const [userPhotos, setUserPhotos] = useState<UserPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  // ── Drag sensors ──
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => { setActiveId(event.active.id as string); };
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    await handleDragEndLogic({ activeId: active.id as string, overId: (over?.id as string) || null, content, setContent, supabase, toast, setUpdatingItemId });
  };
  const handleCollectionDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "collection") setActiveCollectionData(active.data.current.collection);
  };
  const handleCollectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCollectionData(null);
    if (!over || active.data.current?.type !== "collection" || over.data.current?.type !== "folder") return;
    const collectionId = active.id.toString().replace("collection-", "");
    const folderId = over.id.toString().replace("folder-", "");
    try {
      const { data: existing } = await supabase.from("user_folder_items").select("folder_id").eq("folder_id", folderId).eq("collection_id", collectionId).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from("user_folder_items").insert({ folder_id: folderId, collection_id: collectionId });
        if (error) throw error;
        toast({ description: "Added to folder" });
        setCollectionsRefreshKey(prev => prev + 1);
      } else {
        toast({ description: "Already in folder" });
      }
    } catch (_error) {
      toast({ variant: "destructive", description: "Failed to add to folder" });
    }
  };

  // ── Social ──
  const [squad, setSquad] = useState<Profile[]>([]);
  const [userListDialog, setUserListDialog] = useState<{ open: boolean; type: "followers" | "following" }>({ open: false, type: "followers" });
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [claimedPersonForProfile, setClaimedPersonForProfile] = useState<{
    id: string;
    name: string;
    slug: string;
    creditCount: number;
  } | null>(null);
  const isOwnProfile = currentUser?.id === targetUserId;
  const { profile: currentUserProfile } = useUserProfile();
  const verifiedArchitectId = isOwnProfile ? currentUserProfile?.verified_architect_id : profile?.verified_architect_id;

  // ── Derive active section ──
  const defaultSection: SectionKey = claimedPersonForProfile ? "portfolio" : "visited";
  const rawActiveSection: SectionKey =
    legacySectionKey
    ?? (rawSectionParam === "log" ? null : sectionParam)
    ?? defaultSection;
  const activeSection: SectionKey =
    rawActiveSection === "portfolio" && !claimedPersonForProfile ? "visited" : rawActiveSection;

  // Derive content filter directly from section — no separate filter param needed
  const activeFilter =
    activeSection === "visited" ? "visited"
    : activeSection === "saved" ? "pending"
    : "all";

  // ── URL handlers ──
  const handleSectionChange = useCallback((section: SectionKey) => {
    const newParams = new URLSearchParams();
    newParams.set("section", section);
    setSearchParams(newParams, { replace: true, preventScrollReset: true });
  }, [setSearchParams]);

  const handleSearchChange = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query) { newParams.set("search", query); } else { newParams.delete("search"); }
    setSearchParams(newParams, { replace: true, preventScrollReset: true });
  };

  // ── Effects ──
  useEffect(() => {
    if (!authLoading && !currentUser && !routeUsername) navigate("/auth");
  }, [currentUser, authLoading, navigate, routeUsername]);

  useEffect(() => {
    if (!routeUsername && authLoading) return;
    const fetchProfileData = async () => {
      setLoading(true);
      let uid: string | null = null;
      try {
        let query = supabase.from("profiles").select(PROFILE_PAGE_SELECT);
        let data: { id: string; username?: string | null; favorites?: unknown; [key: string]: unknown } | null = null;
        if (routeUsername) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeUsername);
          if (isUuid) { query = query.eq("id", routeUsername); } else { query = query.ilike("username", routeUsername); }
          const res = await query.maybeSingle();
          data = res.data;
          if (data) {
            if (isUuid && data.username) {
              navigate(`/profile/${data.username.toLowerCase()}`, { replace: true });
              return;
            }
            if (!isUuid && routeUsername && routeUsername !== routeUsername.toLowerCase()) {
              navigate(`/profile/${routeUsername.toLowerCase()}`, { replace: true });
              return;
            }
          }
        } else if (currentUser) {
          uid = currentUser.id;
          const res = await supabase.from("profiles").select(PROFILE_PAGE_SELECT).eq("id", uid).maybeSingle();
          data = res.data;
        }
        if (data) {
          const row = data as unknown as Profile;
          setProfile(row);
          uid = data.id;
          setDraftFirm(row.firm ?? "");
          setDraftBio(row.bio ?? "");
          setDraftWebsite(row.website ?? "");
        }
        setTargetUserId(uid);
      } finally {
        setLoading(false);
      }
    };
    void fetchProfileData();
  }, [routeUsername, currentUser, navigate, authLoading]);

  useEffect(() => { if (targetUserId) { fetchStats(); } }, [targetUserId, collectionsRefreshKey]);
  useEffect(() => {
    if (!targetUserId) return;
    setIsFollowing(false);
    void checkIfFollowing();
    void fetchSquad();
  }, [targetUserId, currentUser]);

  useEffect(() => {
    if (!targetUserId) {
      setClaimedPersonForProfile(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const summary = await getClaimedPersonSummaryForProfile(targetUserId);
        if (!cancelled) setClaimedPersonForProfile(summary);
      } catch {
        if (!cancelled) setClaimedPersonForProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  useEffect(() => {
    if (activeSection !== "photos" || !targetUserId || userPhotos.length > 0) return;
    const fetchPhotos = async () => {
      setPhotosLoading(true);
      try {
        const { data } = await supabase
          .from("review_images")
          .select("id, storage_path, review:user_buildings(building:buildings(name))")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false })
          .limit(60);
        if (data) {
          setUserPhotos(
            data.map(img => {
              const review = img.review as | { building?: { name?: string | null } | null } | { building?: { name?: string | null } | null }[] | null;
              const row = Array.isArray(review) ? review[0] : review;
              return { id: img.id, url: getBuildingImageUrl(img.storage_path) || "", building_name: row?.building?.name ?? null };
            }).filter(img => img.url)
          );
        }
      } catch (_e) { /* silent */ } finally { setPhotosLoading(false); }
    };
    fetchPhotos();
  }, [activeSection, targetUserId]);

  // ── Data fetching ──
  const fetchUserContent = useCallback(async (pageIndex: number, reset: boolean = false) => {
    if (!targetUserId) return;
    if (pageIndex === 0) { setContentLoading(true); } else { setIsFetchingMore(true); }
    try {
      let query = supabase
        .from("user_buildings")
        .select(`id, content, rating, created_at, edited_at, user_id, building_id, status,
          building:buildings ( id, name, address, city, country, year_completed, hero_image_url, community_preview_url, slug, short_id, building_credits ( status, credit_tier, person:people (id, name), company:companies (id, name) ) )`)
        .eq("user_id", targetUserId)
        .order("edited_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (activeFilter === "visited") { query = query.eq("status", "visited"); }
      else if (activeFilter === "pending") { query = query.eq("status", "pending"); }
      else { query = query.in("status", ["visited", "pending"]); }
      const from = pageIndex * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);
      const { data: entriesData, error: entriesError } = await query;
      if (entriesError) throw entriesError;
      if (!entriesData || entriesData.length === 0) {
        if (reset) { setContent([]); setHasMore(false); } else { setHasMore(false); }
        return;
      }
      const entryIds = entriesData.map(r => r.id);
      const { data: imagesData } = await supabase.from("review_images").select("id, review_id, storage_path, likes_count").in("review_id", entryIds);
      const imageIds = imagesData?.map(img => img.id) || [];
      const [likesResult, commentsResult, userLikesResult, imageLikesResult] = await Promise.all([
        supabase.from("likes").select("interaction_id").in("interaction_id", entryIds),
        supabase.from("comments").select("interaction_id").in("interaction_id", entryIds),
        currentUser ? supabase.from("likes").select("interaction_id").in("interaction_id", entryIds).eq("user_id", currentUser.id) : Promise.resolve({ data: [] }),
        currentUser && imageIds.length > 0 ? supabase.from("image_likes").select("image_id").in("image_id", imageIds).eq("user_id", currentUser.id) : Promise.resolve({ data: [] }),
      ]);
      const likesCount = new Map<string, number>();
      likesResult.data?.forEach(l => likesCount.set(l.interaction_id, (likesCount.get(l.interaction_id) || 0) + 1));
      const commentsCount = new Map<string, number>();
      commentsResult.data?.forEach(c => commentsCount.set(c.interaction_id, (commentsCount.get(c.interaction_id) || 0) + 1));
      const userLikes = new Set(userLikesResult.data?.map(l => l.interaction_id));
      const userLikedImages = new Set(imageLikesResult.data?.map((l: { image_id: string }) => l.image_id));
      type ProfileReviewImage = { id: string; url: string; likes_count: number; is_liked: boolean; };
      const imagesByReviewId = new Map<string, ProfileReviewImage[]>();
      imagesData?.forEach(img => {
        const obj: ProfileReviewImage = { id: img.id, url: getBuildingImageUrl(img.storage_path) ?? "", likes_count: img.likes_count || 0, is_liked: userLikedImages.has(img.id) };
        if (!imagesByReviewId.has(img.review_id)) imagesByReviewId.set(img.review_id, []);
        imagesByReviewId.get(img.review_id)!.push(obj);
      });
      type ProfileFeedRow = {
        id: string; content: string | null; rating: number | null; created_at: string;
        edited_at?: string | null; status: "visited" | "pending"; building_id: string;
        building?: { id?: string; name?: string | null; address?: string | null; city?: string | null; country?: string | null; year_completed?: number | null; hero_image_url?: string | null; community_preview_url?: string | null; slug?: string | null; short_id?: number | null; building_credits?: BuildingCreditEmbed[] | null; } | null;
      };
      const formattedContent: FeedReview[] = (entriesData as ProfileFeedRow[]).map(item => {
        const reviewLikes = likesCount.get(item.id) || 0;
        const itemImages = imagesByReviewId.get(item.id) || [];
        const imageLikes = itemImages.reduce((sum: number, img: { likes_count?: number }) => sum + (img.likes_count || 0), 0);
        return {
          id: item.id, content: item.content, rating: item.rating, created_at: item.created_at, edited_at: item.edited_at ?? null, status: item.status,
          user: {
            username: profile?.username || "Unknown",
            avatar_url: profile?.avatar_url || null,
            followers_count: null,
          },
          building: { id: item.building?.id || item.building_id, name: item.building?.name || "Unknown Building", address: item.building?.address || null, city: item.building?.city || null, country: item.building?.country || null, year_completed: item.building?.year_completed || null, main_image_url: item.building?.hero_image_url || null, community_preview_url: item.building?.community_preview_url ?? null, slug: item.building?.slug || null, short_id: item.building?.short_id || null, creditedEntities: visibleCreditSummariesFromEmbed(item.building?.building_credits) },
          tags: [] as string[], likes_count: reviewLikes + imageLikes, comments_count: commentsCount.get(item.id) || 0, is_liked: userLikes.has(item.id), watch_with_users: [] as WatchWithUser[], images: itemImages,
        };
      });
      if (reset) { setContent(formattedContent); setHasMore(formattedContent.length === ITEMS_PER_PAGE); setPage(0); }
      else { setContent(prev => [...prev, ...formattedContent]); setHasMore(formattedContent.length === ITEMS_PER_PAGE); }
    } catch (_error) {
    } finally { setContentLoading(false); setIsFetchingMore(false); }
  }, [targetUserId, activeFilter, currentUser, profile]);

  useEffect(() => { if (targetUserId) { fetchUserContent(0, true); } }, [fetchUserContent]);
  useEffect(() => {
    if (isVisible && hasMore && !isFetchingMore && !contentLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUserContent(nextPage, false);
    }
  }, [isVisible, hasMore, isFetchingMore, contentLoading, page, fetchUserContent]);

  const filteredContent = useMemo(() => {
    return content.filter(item => {
      const matchesSearch = searchQuery === "" || item.building.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [content, searchQuery]);

  const kanbanData = useMemo(() => {
    const sortByDate = (a: FeedReview, b: FeedReview) => {
      const dateA = new Date(a.edited_at || a.created_at).getTime();
      const dateB = new Date(b.edited_at || b.created_at).getTime();
      return dateB - dateA;
    };
    return {
      saved: filteredContent.filter(item => item.rating === null || item.rating === 0).sort(sortByDate),
      onePoint: filteredContent.filter(item => item.rating === 1).sort(sortByDate),
      twoPoints: filteredContent.filter(item => item.rating === 2).sort(sortByDate),
      threePoints: filteredContent.filter(item => item.rating === 3).sort(sortByDate),
    };
  }, [filteredContent]);

  const checkIfFollowing = async () => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) return;
    const { data } = await supabase.from("follows").select("*").eq("follower_id", currentUser.id).eq("following_id", targetUserId).maybeSingle();
    setIsFollowing(!!data);
  };

  const fetchStats = async () => {
    if (!targetUserId) return;
    const [reviewsResult, pendingResult, followersResult, followingResult, photosResult, collectionsResult] = await Promise.all([
      supabase.from("user_buildings").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("status", "visited"),
      supabase.from("user_buildings").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("status", "pending"),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", targetUserId),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", targetUserId),
      supabase.from("review_images").select("id", { count: "exact", head: true }).eq("user_id", targetUserId),
      supabase.from("collections").select("id", { count: "exact", head: true }).eq("owner_id", targetUserId),
    ]);
    setStats({ reviews: reviewsResult.count || 0, pending: pendingResult.count || 0, followers: followersResult.count || 0, following: followingResult.count || 0, photos: photosResult.count || 0, maps: collectionsResult.count || 0 });
  };

  const fetchSquad = async () => {
    if (!targetUserId || !isOwnProfile) return;
    const { data } = await supabase.from("follows").select("following:profiles!follows_following_id_fkey(id, username, avatar_url)").eq("follower_id", targetUserId).limit(5);
    if (data) {
      const squadMembers = data.map(row => { const f = row.following; return Array.isArray(f) ? f[0] : f; }).filter((p): p is Profile => p != null);
      setSquad(squadMembers);
    }
  };

  const handleUpdate = async (id: string, updates: { status?: string; rating?: number | null; content?: string }) => {
    if (!currentUser || !isOwnProfile) return;
    const previousContent = [...content];
    const itemIndex = content.findIndex(i => i.id === id);
    if (itemIndex === -1) return;
    const currentItem = content[itemIndex];
    const newItem = { ...currentItem, ...updates, edited_at: new Date().toISOString() };
    setContent(prev => prev.map(item => item.id === id ? newItem : item));
    if (updates.status && updates.status !== currentItem.status) {
      setStats(prev => {
        const newStats = { ...prev };
        if (currentItem.status === "pending") { newStats.pending = Math.max(0, newStats.pending - 1); } else { newStats.reviews = Math.max(0, newStats.reviews - 1); }
        if (updates.status === "pending") { newStats.pending++; } else { newStats.reviews++; }
        return newStats;
      });
    }
    try {
      const { error } = await supabase.from("user_buildings").update({ ...updates, edited_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      if (updates.status) toast({ description: "Status updated" });
    } catch (_error) {
      setContent(previousContent);
      if (updates.status && updates.status !== currentItem.status) {
        setStats(prev => {
          const newStats = { ...prev };
          if (updates.status === "pending") { newStats.pending--; } else { newStats.reviews--; }
          if (currentItem.status === "pending") { newStats.pending++; } else { newStats.reviews++; }
          return newStats;
        });
      }
      toast({ variant: "destructive", description: "Failed to update" });
    }
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const handleSaveHeader = async () => {
    if (!currentUser || !targetUserId) return;
    const parsed = profileHeaderUpdateSchema.safeParse({
      bio: draftBio,
      firm: draftFirm,
      website: draftWebsite,
    });
    if (!parsed.success) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: parsed.error.issues[0]?.message ?? "Invalid profile data",
      });
      return;
    }
    const v = parsed.data;
    setIsSavingHeader(true);
    try {
      const payload: {
        bio: string | null;
        website: string | null;
        firm?: string | null;
        updated_at: string;
      } = {
        bio: v.bio,
        website: v.website,
        updated_at: new Date().toISOString(),
      };
      if (verifiedArchitectId) {
        payload.firm = v.firm;
      }
      const { error } = await supabase.from("profiles").update(payload).eq("id", targetUserId);
      if (error) throw error;
      setProfile(prev =>
        prev
          ? {
              ...prev,
              bio: v.bio,
              website: v.website,
              ...(verifiedArchitectId ? { firm: v.firm } : {}),
            }
          : prev,
      );
      setIsEditingHeader(false);
      toast({ description: "Profile updated" });
    } catch (_error) {
      toast({ variant: "destructive", description: "Failed to update profile" });
    } finally {
      setIsSavingHeader(false);
    }
  };

  const openUserList = async (type: "followers" | "following") => {
    setUserListDialog({ open: true, type });
    setUserListLoading(true);
    setUserList([]);
    if (!targetUserId) return;
    try {
      let ids: string[] = [];
      if (type === "followers") {
        const { data } = await supabase.from("follows").select("follower_id").eq("following_id", targetUserId);
        ids = data?.map(f => f.follower_id) || [];
      } else {
        const { data } = await supabase.from("follows").select("following_id").eq("follower_id", targetUserId);
        ids = data?.map(f => f.following_id) || [];
      }
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
        let formattedUsers: UserListItem[] = [];
        if (profiles && currentUser) {
          const [myFollowingResult, myFollowersResult] = await Promise.all([
            supabase.from("follows").select("following_id").eq("follower_id", currentUser.id).in("following_id", ids),
            supabase.from("follows").select("follower_id").eq("following_id", currentUser.id).in("follower_id", ids),
          ]);
          const myFollowingIds = new Set(myFollowingResult.data?.map(f => f.following_id));
          const myFollowerIds = new Set(myFollowersResult.data?.map(f => f.follower_id));
          formattedUsers = profiles.map(p => ({ ...p, is_following: myFollowingIds.has(p.id), is_follower: myFollowerIds.has(p.id) }));
          formattedUsers.sort((a, b) => {
            if (a.is_following && !b.is_following) return -1;
            if (!a.is_following && b.is_following) return 1;
            if (a.is_follower && !b.is_follower) return -1;
            if (!a.is_follower && b.is_follower) return 1;
            return (a.username || "").localeCompare(b.username || "");
          });
        } else {
          formattedUsers = profiles?.map(p => ({ ...p, is_following: false, is_follower: false })) || [];
        }
        setUserList(formattedUsers);
      }
    } catch (_error) { void _error; }
    finally { setUserListLoading(false); }
  };

  // ─── Loading / not found states ──────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface-default flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
      </div>
    );
  }

  if (!profile) {
    // Logged-out /profile: redirect runs in an effect — avoid a false "not found" flash.
    if (!routeUsername && !currentUser) {
      return null;
    }
    return (
      <AppLayout title="User Not Found" showLogo={false} showBack>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-6">Unavailable</p>
          <h2 className="text-5xl font-bold tracking-tight text-text-primary mb-4 leading-none">User not found</h2>
          <p className="text-base text-text-secondary max-w-sm mx-auto mb-10 leading-relaxed">
            This profile is not available. The user might have been deleted, suspended, or does not exist.
          </p>
          <button onClick={() => navigate("/")} className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity">
            Go home →
          </button>
        </div>
      </AppLayout>
    );
  }

  // ─── Tab config — metrics as tabs ────────────────────────────────────────
  const tabs: { key: SectionKey; label: string; count: number | null }[] = [
    ...(claimedPersonForProfile ? [{ key: "portfolio" as SectionKey, label: "Portfolio", count: null }] : []),
    { key: "visited", label: "Visited", count: stats.reviews },
    { key: "saved", label: "Saved", count: stats.pending },
    { key: "collections", label: "Collections", count: stats.maps },
    { key: "photos", label: "Photos", count: stats.photos },
    { key: "about", label: "About", count: null },
  ];

  const hasAnyHeaderContent = profile?.firm || profile?.bio || profile?.website;

  // ─── Main render ─────────────────────────────────────────────────────────
  return (
    <>
      <AppLayout title={profile?.username || "Profile"} showLogo={false} showBack={!isOwnProfile} fullWidth>

        {/* ══ PROFILE HERO ══════════════════════════════════════════════════ */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:gap-12 lg:gap-20 pt-10 pb-10 border-b border-border-default">

            {/* LEFT — text */}
            <div className="flex-1 min-w-0 mt-6 sm:mt-0">

              {/* Action bar */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 min-h-[20px]">
                  {verifiedArchitectId && (
                    <>
                      <BadgeCheck className="w-3.5 h-3.5 text-text-primary shrink-0" />
                      <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary">Architect</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-5">
                  {isOwnProfile ? (
                    isEditingHeader ? (
                      <>
                        <button type="button" onClick={() => setIsEditingHeader(false)} className="text-xs font-medium uppercase tracking-widest text-text-disabled hover:text-text-primary transition-colors">
                          Cancel
                        </button>
                        <button type="button" onClick={handleSaveHeader} disabled={isSavingHeader} className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity disabled:opacity-40 flex items-center gap-1.5">
                          {isSavingHeader ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setDraftFirm(profile?.firm || ""); setDraftBio(profile?.bio || ""); setDraftWebsite(profile?.website || ""); setIsEditingHeader(true); }} className="inline-flex items-center justify-center min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-0 text-text-disabled hover:text-text-primary transition-colors" aria-label="Edit profile">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <Link to="/settings" className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">
                          Settings →
                        </Link>
                        <button type="button" onClick={handleSignOut} className="text-text-disabled hover:text-text-primary transition-colors" aria-label="Sign out">
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )
                  ) : (
                    targetUserId && <FollowButton userId={targetUserId} initialIsFollowing={isFollowing} className="h-7 text-xs px-4" />
                  )}
                </div>
              </div>

              {/* Username — hero title */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary leading-none break-words mb-5">
                {profile?.username}
              </h1>

              {/* Editable fields or display */}
              {isEditingHeader ? (
                <div className="space-y-2.5 max-w-sm mb-5">
                  {verifiedArchitectId && (
                    <Input
                      value={draftFirm}
                      onChange={e => setDraftFirm(e.target.value)}
                      placeholder="Practice or firm name..."
                      className="h-8 text-sm bg-transparent border-border-default"
                    />
                  )}
                  <textarea
                    value={draftBio}
                    onChange={e => setDraftBio(e.target.value)}
                    placeholder="Short bio..."
                    rows={3}
                    className="w-full text-sm text-text-primary bg-transparent border border-border-default px-3 py-2 resize-none focus:outline-none focus:border-border-strong placeholder:text-text-disabled leading-relaxed"
                  />
                  <Input
                    value={draftWebsite}
                    onChange={e => setDraftWebsite(e.target.value)}
                    placeholder="Website or portfolio URL..."
                    className="h-8 text-sm bg-transparent border-border-default"
                  />
                </div>
              ) : (
                <div className="space-y-2 mb-5">
                  {profile?.firm && (
                    <p className="text-sm font-medium text-text-secondary">{profile.firm}</p>
                  )}
                  {profile?.bio && (
                    <p className="text-base text-text-secondary leading-relaxed max-w-lg">{profile.bio}</p>
                  )}
                  {profile?.website && (
                    <a
                      href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-text-disabled hover:text-text-primary transition-colors"
                    >
                      {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {isOwnProfile && !hasAnyHeaderContent && (
                    <button type="button" onClick={() => setIsEditingHeader(true)} className="text-xs font-medium uppercase tracking-widest text-text-disabled hover:text-text-primary transition-colors">
                      + Add bio{verifiedArchitectId ? ", firm" : ""} & website
                    </button>
                  )}
                </div>
              )}

              {/* Followers / following — secondary row */}
              <div className="flex items-center gap-5">
                <button onClick={() => openUserList("followers")} className="text-left hover:opacity-60 active:opacity-60 transition-opacity">
                  <span className="text-sm font-semibold text-text-primary">{stats.followers}</span>
                  <span className="text-xs text-text-disabled ml-1.5">followers</span>
                </button>
                <button onClick={() => openUserList("following")} className="text-left hover:opacity-60 active:opacity-60 transition-opacity">
                  <span className="text-sm font-semibold text-text-primary">{stats.following}</span>
                  <span className="text-xs text-text-disabled ml-1.5">following</span>
                </button>
              </div>
            </div>

            {/* RIGHT — portrait photo */}
            <div className="shrink-0 self-start">
              {profile?.avatar_url ? (
                <div className="w-32 h-40 sm:w-44 sm:h-56 overflow-hidden bg-surface-muted">
                  <img
                    src={profile.avatar_url}
                    alt={profile.username || ""}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-40 sm:w-44 sm:h-56 bg-surface-muted flex items-end p-3">
                  <span className="text-5xl sm:text-6xl font-bold text-border-strong leading-none select-none">
                    {profile?.username?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {isOwnProfile && claimedPersonForProfile ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="rounded-sm border border-border-default bg-surface-muted px-4 py-4 sm:px-5">
              <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary mb-2">
                Professional profile
              </p>
              <Link
                to={`/person/${claimedPersonForProfile.slug}`}
                className="text-lg font-semibold tracking-tight text-text-primary hover:opacity-80 transition-opacity"
              >
                {claimedPersonForProfile.name}
              </Link>
              <p className="mt-1 text-sm text-text-secondary">
                Credited on {claimedPersonForProfile.creditCount}{" "}
                {claimedPersonForProfile.creditCount === 1 ? "building" : "buildings"}
              </p>
            </div>
          </div>
        ) : null}

        {/* ══ METRICS AS TABS ══════════════════════════════════════════════ */}
        <div className="sticky top-0 z-20 bg-surface-default border-b border-border-default">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex -mb-px overflow-x-auto scrollbar-none">
              {tabs.map(tab => {
                const isActive = activeSection === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleSectionChange(tab.key)}
                    className={`shrink-0 px-5 py-3 border-b-2 transition-colors text-left ${
                      isActive ? "border-text-primary" : "border-transparent hover:border-border-default"
                    }`}
                  >
                    {tab.count !== null ? (
                      <>
                        <div className={`text-base font-bold tracking-tight leading-none ${isActive ? "text-text-primary" : "text-text-disabled"}`}>
                          {tab.count.toLocaleString()}
                        </div>
                        <div className={`text-2xs font-medium tracking-widest uppercase mt-0.5 ${isActive ? "text-text-secondary" : "text-text-disabled"}`}>
                          {tab.label}
                        </div>
                      </>
                    ) : (
                      <div className={`text-xs font-medium tracking-widest uppercase leading-none py-1 ${isActive ? "text-text-primary" : "text-text-disabled"}`}>
                        {tab.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ CONTENT BODY ═════════════════════════════════════════════════ */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[60vh] py-10">

            {/* ── PORTFOLIO (claimed `people` row — link to full dashboard or public person page) ── */}
            {activeSection === "portfolio" && claimedPersonForProfile && (
              <WidgetErrorBoundary>
                <div className="mx-auto max-w-lg space-y-6 border border-border-default bg-surface-muted px-6 py-10 text-center">
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {isOwnProfile
                      ? "Open your portfolio dashboard for a sortable, tier-grouped view of every building you are credited on."
                      : "View this member’s credited work on their public professional profile."}
                  </p>
                  {isOwnProfile ? (
                    <Button asChild size="lg" className="min-w-[220px]">
                      <Link to="/portfolio">Open portfolio dashboard</Link>
                    </Button>
                  ) : (
                    <Button asChild size="lg" variant="outline" className="min-w-[220px]">
                      <Link to={`/person/${claimedPersonForProfile.slug}`}>View public portfolio</Link>
                    </Button>
                  )}
                </div>
              </WidgetErrorBoundary>
            )}

            {/* ── VISITED / SAVED (both are log views) ── */}
            {(activeSection === "visited" || activeSection === "saved") && (
              <div>
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <ToggleGroup type="single" value={viewMode} onValueChange={v => v && setViewMode(v as "grid" | "kanban" | "list")}>
                      <ToggleGroupItem value="grid" size="sm" aria-label="Grid"><LayoutGrid className="h-3.5 w-3.5" /></ToggleGroupItem>
                      <ToggleGroupItem value="kanban" size="sm" aria-label="Kanban"><Columns className="h-3.5 w-3.5" /></ToggleGroupItem>
                      <ToggleGroupItem value="list" size="sm" aria-label="List"><List className="h-3.5 w-3.5" /></ToggleGroupItem>
                    </ToggleGroup>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <span className="text-2xs font-medium tracking-widest uppercase text-text-disabled">Hero</span>
                      <Switch checked={showCommunityImages} onCheckedChange={setShowCommunityImages} className="scale-75 origin-right" />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-disabled" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                        className={cn(
                          "pl-8 h-7 w-32 text-xs bg-surface-muted/40 border-transparent focus:bg-surface-default focus:w-44 transition-all",
                          searchQuery && "pr-11",
                        )}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => handleSearchChange("")}
                          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center"
                          aria-label="Clear search"
                        >
                          <X className="h-3 w-3 text-text-disabled hover:text-text-primary" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="h-7 max-md:min-h-11 px-2.5 max-md:px-3 border border-border-default text-text-disabled hover:text-text-primary hover:border-border-strong transition-colors inline-flex items-center justify-center"
                      onClick={() => navigate(activeSection === "saved" ? `/search?rated_by=${profile?.username || ""}&open_filters=true&mode=library&status=visited%2Csaved%2Cpending` : `/search?rated_by=${profile?.username || ""}&open_filters=true`)}
                      title="View on map"
                    >
                      <MapIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {contentLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-text-disabled" /></div>
                ) : filteredContent.length > 0 ? (
                  <>
                    <WidgetErrorBoundary>
                      <AnimatePresence mode="wait">
                        {viewMode === "grid" ? (
                          <motion.div key="grid" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.15 }}>
                            {/* Editorial grid — no borders, no icons */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 pb-16">
                              {filteredContent.map(item => (
                                <EditorialBuildingCard key={item.id} entry={item} showCommunityImages={showCommunityImages} />
                              ))}
                            </div>
                          </motion.div>
                        ) : viewMode === "list" ? (
                          <motion.div key="list" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.15 }}>
                            <ProfileListView
                              data={filteredContent}
                              isOwnProfile={isOwnProfile}
                              onUpdate={handleUpdate}
                              showCommunityImages={showCommunityImages}
                            />
                          </motion.div>
                        ) : (
                          <motion.div key="kanban" variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.15 }}>
                            <div className="-mx-4">
                              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                <ProfileKanbanView kanbanData={kanbanData} showCommunityImages={showCommunityImages} updatingItemId={updatingItemId} isDragEnabled={isOwnProfile} />
                                <DragOverlay dropAnimation={null}>
                                  {activeId ? (
                                    <div className="w-[280px] scale-105 shadow-lg z-50 cursor-grabbing bg-surface-card border border-border-default overflow-hidden opacity-90">
                                      {(() => {
                                      const activeItem = content.find((i) => i.id === activeId);
                                      return activeItem ? (
                                        <ProfileReviewCard
                                          entry={activeItem}
                                          index={0}
                                          imagePosition="left"
                                          showCommunityImages={showCommunityImages}
                                        />
                                      ) : null;
                                    })()}
                                    </div>
                                  ) : null}
                                </DragOverlay>
                              </DndContext>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </WidgetErrorBoundary>
                    <div ref={containerRef} className="h-4 w-full" />
                  </>
                ) : searchQuery ? (
                  <EmptyState icon={Search} label="No results found" />
                ) : activeSection === "visited" ? (
                  <EmptyState icon={Building2} label="No visited buildings yet" />
                ) : (
                  <EmptyState
                    icon={Bookmark}
                    label="Bucket list is empty"
                    description={isOwnProfile ? "Never forget a recommendation again. Add buildings here to build your personal queue." : undefined}
                    action={isOwnProfile ? (
                      <button type="button" onClick={() => navigate("/search")} className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity">
                        Search buildings →
                      </button>
                    ) : undefined}
                  />
                )}
                {isFetchingMore && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-text-disabled" /></div>}
              </div>
            )}

            {/* ── COLLECTIONS ── */}
            {activeSection === "collections" && targetUserId && (
              <div>
                <WidgetErrorBoundary>
                  <DndContext sensors={sensors} onDragStart={handleCollectionDragStart} onDragEnd={handleCollectionDragEnd}>
                    <CollectionsGrid userId={targetUserId} username={profile?.username || null} isOwnProfile={isOwnProfile} onCreate={isOwnProfile ? () => setShowCreateCollection(true) : undefined} refreshKey={collectionsRefreshKey} />
                    <DragOverlay dropAnimation={null}>
                      {activeCollectionData ? (
                        <div className="inline-block cursor-grabbing overflow-hidden border border-border-default bg-surface-card opacity-90 shadow-lg">
                          <div className="flex h-[120px] w-[min(92vw,280px)] flex-col justify-between p-5">
                            <h4 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight text-text-primary">{activeCollectionData.name}</h4>
                          </div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </WidgetErrorBoundary>
              </div>
            )}

            {targetUserId ? (
              <ProfileEventsSection
                profileUserId={targetUserId}
                viewingUserId={currentUser?.id ?? null}
                isOwnProfile={isOwnProfile}
              />
            ) : null}

            {/* ── PHOTOS — editorial masonry ── */}
            {activeSection === "photos" && (
              <div>
                <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-8">
                  Photos by {profile?.username}
                </p>
                {photosLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-text-disabled" /></div>
                ) : userPhotos.length > 0 ? (
                  <MasonryPhotoGrid photos={userPhotos} />
                ) : (
                  <EmptyState icon={Search} label="No photos yet" description={isOwnProfile ? "Photos you upload when reviewing buildings will appear here." : undefined} />
                )}
              </div>
            )}

            {/* ── ABOUT ── */}
            {activeSection === "about" && (
              <div className="max-w-md space-y-10">
                {(profile?.bio || profile?.firm || profile?.website) && (
                  <div className="space-y-6">
                    {profile?.firm && (
                      <div>
                        <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-1.5">Practice</p>
                        <p className="text-base font-medium text-text-primary">{profile.firm}</p>
                      </div>
                    )}
                    {profile?.bio && (
                      <div>
                        <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-1.5">Bio</p>
                        <p className="text-base text-text-primary leading-relaxed">{profile.bio}</p>
                      </div>
                    )}
                    {profile?.website && (
                      <div>
                        <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-1.5">Website</p>
                        <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-text-primary hover:opacity-60 transition-opacity">
                          {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          <ExternalLink className="w-3 h-3 text-text-disabled" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {verifiedArchitectId && (
                  <div>
                    <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-2">Role</p>
                    <div className="flex items-center gap-2 text-sm text-text-primary">
                      <BadgeCheck className="w-4 h-4 shrink-0" />
                      Verified architect on Plano
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-5">Connections</p>
                  <div className="flex gap-12">
                    <button onClick={() => openUserList("followers")} className="text-left hover:opacity-60 active:opacity-60 transition-opacity">
                      <div className="text-3xl font-bold tracking-tight text-text-primary leading-none">{stats.followers}</div>
                      <div className="text-2xs font-medium tracking-widest uppercase text-text-secondary mt-1.5">Followers</div>
                    </button>
                    <button onClick={() => openUserList("following")} className="text-left hover:opacity-60 active:opacity-60 transition-opacity">
                      <div className="text-3xl font-bold tracking-tight text-text-primary leading-none">{stats.following}</div>
                      <div className="text-2xs font-medium tracking-widest uppercase text-text-secondary mt-1.5">Following</div>
                    </button>
                  </div>
                </div>

                {squad.length > 0 && isOwnProfile && (
                  <div>
                    <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-5">Following</p>
                    <div className="flex gap-5 flex-wrap">
                      {squad.map(member => (
                        <Link key={member.id} to={`/profile/${member.username}`} className="flex flex-col items-center gap-2 hover:opacity-60 transition-opacity w-14">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{member.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-2xs text-text-secondary text-center truncate w-full">{member.username}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Dialogs ── */}
        <Dialog open={userListDialog.open} onOpenChange={open => setUserListDialog(prev => ({ ...prev, open }))}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xs font-medium tracking-widest uppercase text-center text-text-secondary">
                {userListDialog.type}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {userListLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-4 w-4 animate-spin text-text-disabled" /></div>
              ) : userList.length > 0 ? (
                <div className="space-y-0 p-1">
                  {userList.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-3 border-b border-border-default last:border-0 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => { setUserListDialog(prev => ({ ...prev, open: false })); navigate(`/profile/${u.username?.toLowerCase()}`); }}>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm text-text-primary">{u.username || "Unknown"}</span>
                      </div>
                      {currentUser && currentUser.id !== u.id && (
                        <div onClick={e => e.stopPropagation()}>
                          <FollowButton userId={u.id} initialIsFollowing={u.is_following} isFollower={u.is_follower} className="h-7 text-xs px-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-text-disabled text-sm">No users found</div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {currentUser && (
          <CreateCollectionDialog
            open={showCreateCollection}
            onOpenChange={setShowCreateCollection}
            userId={currentUser.id}
            onSuccess={() => { setCollectionsRefreshKey(prev => prev + 1); setShowCreateCollection(false); }}
          />
        )}

      </AppLayout>
    </>
  );
}

// ─── Editorial Building Card ──────────────────────────────────────────────────
// No card chrome. 3:4 portrait image, bold name, faint meta below.
function EditorialBuildingCard({ entry, showCommunityImages }: { entry: FeedReview; showCommunityImages: boolean }) {
  const imageUrl = profileLogCardImageUrl(entry, showCommunityImages);
  const topCredit = entry.building.creditedEntities?.[0];
  const meta = [topCredit?.name, entry.building.year_completed].filter(Boolean).join(" · ");
  // Locality URL not available: ReviewBuilding (FeedReview) does not include locality_country_code/city_slug — requires get_feed RPC to include locality fields in building_data
  const url = getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id);

  return (
    <Link to={url} className="group block" data-testid={`review-card-${entry.id}`}>
      {/* 3:4 portrait image, no rounding */}
      <div className="aspect-[3/4] overflow-hidden bg-surface-muted mb-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={entry.building.name}
            className="w-full h-full object-cover group-hover:opacity-85 transition-opacity duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-end p-3">
            <span className="text-text-disabled text-xs font-medium uppercase tracking-wide leading-tight line-clamp-3">
              {entry.building.name}
            </span>
          </div>
        )}
      </div>
      {/* Text — no icons, stark hierarchy */}
      <p className="text-sm font-bold text-text-primary leading-snug line-clamp-2 group-hover:opacity-60 transition-opacity">
        {entry.building.name}
      </p>
      {meta && (
        <p className="text-2xs text-text-disabled mt-0.5 truncate">{meta}</p>
      )}
    </Link>
  );
}

// ─── Masonry Photo Grid ───────────────────────────────────────────────────────
// CSS columns masonry. Photos at index 0, 7, 14… get a taller aspect ratio.
function MasonryPhotoGrid({ photos }: { photos: UserPhoto[] }) {
  return (
    <div className="columns-2 md:columns-3 gap-px">
      {photos.map((photo, i) => {
        const isFeatured = i === 0 || i % 7 === 0;
        return (
          <div
            key={photo.id}
            className={`relative overflow-hidden bg-surface-muted group cursor-pointer break-inside-avoid mb-px ${isFeatured ? "aspect-[3/4]" : "aspect-square"}`}
          >
            <img
              src={photo.url}
              alt={photo.building_name || ""}
              className="w-full h-full object-cover group-hover:opacity-85 transition-opacity duration-200"
            />
            {photo.building_name && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 [@media(hover:none)]:bg-black/50 transition-colors flex items-end">
                <span className="translate-y-1.5 group-hover:translate-y-0 [@media(hover:none)]:translate-y-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-all duration-200 text-2xs-plus text-white font-medium px-2.5 pb-2.5 line-clamp-1 leading-tight">
                  {photo.building_name}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, label, description, action }: { icon: LucideIcon; label: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-8 gap-5">
      <Icon className="h-7 w-7 text-text-disabled" strokeWidth={1.5} />
      <div className="space-y-2">
        <p className="text-base font-semibold text-text-primary tracking-tight">{label}</p>
        {description && <p className="text-sm text-text-secondary max-w-xs leading-relaxed">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}