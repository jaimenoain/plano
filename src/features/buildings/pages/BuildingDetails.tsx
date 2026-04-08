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
  Pencil, BadgeCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resizeImageWithDimensions } from "@/lib/image-compression";
import { uploadFile } from "@/utils/upload";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { UserPicker } from "@/components/common/UserPicker";
import { parseLocation } from "@/utils/location";
import { getBuildingImageUrl } from "@/utils/image";
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
import { BuildingHeader } from "../components/BuildingHeader";
import { PrimaryCreditsLinks } from "../components/PrimaryCreditsLinks";
import { ArchitectStatement } from "../components/ArchitectStatement";
import { BuildingHero } from "../components/BuildingHero";
import { BuildingAttributes } from "../components/BuildingAttributes";
import { BuildingCredits } from "../components/BuildingCredits";
import { buildingLoader } from "./BuildingDetails.loader";
import {
  buildingAbsoluteUrl,
  buildingStructuredData,
  buildingDescription,
  SITE_URL,
} from "@/features/buildings/utils/structuredData";
import { synthesizeAccess } from "@/utils/accessSynthesis";

export { buildingLoader as loader } from "./BuildingDetails.loader";

export function HydrateFallback() {
  return (
    <AppLayout showBack title="Loading...">
      <Skeleton className="aspect-[21/9] w-full rounded-sm" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-2/5 max-w-md" />
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
            type="button" size="lg" variant="default" className="min-w-[200px]"
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

// --- Types ---
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
  /** Legacy: always empty from loader; credits replace `building_architects`. */
  architects?: { id: string; name: string }[];
  year_completed: number;
  styles: { id: string, name: string }[];
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

interface TopLink {
  link_id: string;
  url: string;
  title: string | null;
  like_count: number;
  user_username: string | null;
  user_avatar: string | null;
}

interface FeedEntry {
  id: string;
  user_id: string;
  content: string | null;
  rating: number | null;
  status: 'visited' | 'pending';
  tags: string[] | null;
  created_at: string;
  user: {
    username: string | null;
    avatar_url: string | null;
    is_verified_architect?: boolean;
    is_architect_of_building?: boolean;
  };
  images: { id: string; storage_path: string; created_at?: string; }[];
}

interface RpcBuildingReviewRow {
  id: string;
  user_id: string;
  created_at: string;
  user_data: FeedEntry["user"] | null;
  images?: Array<{
    id: string;
    storage_path: string;
    likes_count?: number;
    created_at?: string;
    is_generated?: boolean;
    is_official?: boolean;
  }>;
  video_url?: string | null;
  content?: string | null;
  rating?: number | null;
  status?: FeedEntry["status"];
  tags?: string[] | null;
}

interface DisplayImage {
  id: string;
  url: string;
  poster?: string;
  type?: 'image' | 'video';
  likes_count: number;
  created_at: string;
  user: { username: string | null; avatar_url: string | null; } | null;
  is_generated?: boolean;
  is_official?: boolean;
}

export default function BuildingDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    building: loaderBuilding,
    heroImageUrl: initialHeroImageUrl,
    buildingCredits: initialBuildingCredits = [],
  } = useLoaderData<typeof buildingLoader>();

  const [building, setBuilding] = useState<BuildingDetails | null>(() => {
    const b = loaderBuilding as BuildingDetails | null | undefined;
    return b ?? null;
  });

  useEffect(() => {
    const b = loaderBuilding as BuildingDetails | null | undefined;
    if (b) setBuilding(b);
  }, [loaderBuilding]);

  const { data: buildingCredits = initialBuildingCredits } = useQuery({
    queryKey: buildingCreditsQueryKey(building?.id ?? ""),
    queryFn: () => getBuildingCredits(building!.id),
    enabled: !!building?.id,
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
  const [loading, setLoading] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [userStatus, setUserStatus] = useState<'visited' | 'pending' | 'ignored' | null>(null);
  const [myRating, setMyRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [displayImages, setDisplayImages] = useState<DisplayImage[]>([]);
  const [userImages, setUserImages] = useState<{id: string, storage_path: string, is_generated?: boolean; is_official?: boolean | null}[]>([]);
  const [selectedImage, setSelectedImage] = useState<DisplayImage | null>(null);
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [likedLinkIds, setLikedLinkIds] = useState<Set<string>>(new Set());
  const [linksLoading, setLinksLoading] = useState(true);
  const [, setIsEditing] = useState(false);
  const [_socialContext, setSocialContext] = useState<string | null>(null);
  const [isOfficialEditing, setIsOfficialEditing] = useState(false);
  const [verifiedClaims, setVerifiedClaims] = useState<string[]>([]);
  const [hasVerifiedArchitect, setHasVerifiedArchitect] = useState(false);

  const primaryPersonIds = useMemo(
    () =>
      visiblePrimaryCredits(buildingCredits)
        .map((c) => c.personId)
        .filter((id): id is string => id != null),
    [buildingCredits],
  );

  const isVerifiedArchitect = useMemo(() => {
    if (primaryPersonIds.length === 0 || verifiedClaims.length === 0) return false;
    return primaryPersonIds.some((id) => verifiedClaims.includes(id));
  }, [primaryPersonIds, verifiedClaims]);

  const canEditOfficialData = profile?.role === 'admin' || isVerifiedArchitect || (isCreator && !hasVerifiedArchitect);

  const [draftOfficialData, setDraftOfficialData] = useState({ name: "", year_completed: 0, city: "", country: "", architect_statement: "" });
  const [isSavingOfficial, setIsSavingOfficial] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(initialHeroImageUrl);
  const [userLinks, setUserLinks] = useState<{id: string, url: string, title: string}[]>([]);
  const [pendingImages, setPendingImages] = useState<
    {
      id: string;
      file: File;
      preview: string;
      is_generated: boolean;
      width_px: number | null;
      height_px: number | null;
    }[]
  >([]);
  const [likedImageIds, setLikedImageIds] = useState<Set<string>>(new Set());
  const [showCollections, setShowCollections] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [note, setNote] = useState("");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [initialCollectionIds, setInitialCollectionIds] = useState<string[]>([]);
  const [, setShowNoteEditor] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [showVisitWith, setShowVisitWith] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showDirectionsAlert, setShowDirectionsAlert] = useState(false);
  const [interactiveUiReady, setInteractiveUiReady] = useState(false);

  const selectedIndex = useMemo(() => {
    if (!selectedImage) return -1;
    return displayImages.findIndex(img => img.id === selectedImage.id);
  }, [selectedImage, displayImages]);

  const handleNextImage = () => { if (selectedIndex < displayImages.length - 1) setSelectedImage(displayImages[selectedIndex + 1]); };
  const handlePrevImage = () => { if (selectedIndex > 0) setSelectedImage(displayImages[selectedIndex - 1]); };

  const coordinates = useMemo(() => parseLocation(building?.location), [building]);

  // --- Derived stats for hero overlay ---
  const visitorCount = useMemo(() => entries.filter(e => e.status === "visited").length, [entries]);
  const avgRating = useMemo(() => {
    const rated = entries.filter(e => e.rating != null);
    if (rated.length === 0) return null;
    return rated.reduce((sum, e) => sum + e.rating!, 0) / rated.length;
  }, [entries]);

  // --- Access synthesis ---
  const accessSynthesis = useMemo(() => {
    if (!building || (!building.access_level && !building.access_logistics && !building.access_cost)) return null;
    return synthesizeAccess(building.access_level || null, building.access_logistics || null, building.access_cost || null);
  }, [building]);

  const accessBadgeVariant = (): "default" | "success" | "warning" | "brand" => {
    const level = building?.access_level;
    if (level === "public") return "success";
    if (level === "commercial") return "brand";
    if (level === "private" || level === "restricted") return "warning";
    if (accessSynthesis?.variant === "warning") return "warning";
    if (accessSynthesis?.variant === "outline") return "brand";
    return "default";
  };

  useEffect(() => {
    if (building) {
      setDraftOfficialData({
        name: building.name,
        year_completed: building.year_completed,
        city: building.city || "",
        country: building.country || "",
        architect_statement: building.architect_statement || ""
      });
    }
  }, [building]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMapExpanded) setIsMapExpanded(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapExpanded]);

  useEffect(() => {
    if (id) void fetchUserSpecificData();
  }, [id, user, buildingCreditsFingerprint]);
  useEffect(() => { setInteractiveUiReady(true); }, []);

  // ─── DATA FETCHING ───────────────────────────────────────────────────────

  const fetchUserSpecificData = async () => {
    if (!id || !building) return;
    setLoading(true);
    try {
      const resolvedBuildingId = building.id;
      if (user && building.created_by === user.id) setIsCreator(true);
      const tasks: Promise<void>[] = [];

      const personIdsForVerified = visiblePrimaryCredits(buildingCredits)
        .map((c) => c.personId)
        .filter((pid): pid is string => pid != null);
      if (personIdsForVerified.length > 0) {
        tasks.push((async () => {
          const { data: verifiedProfiles } = await supabase
            .from("profiles")
            .select("id")
            .in("verified_architect_id", personIdsForVerified)
            .limit(1);
          setHasVerifiedArchitect(!!(verifiedProfiles && verifiedProfiles.length > 0));
        })());
      } else {
        setHasVerifiedArchitect(false);
      }

      tasks.push(fetchTopLinks(resolvedBuildingId));

      if (user) {
        tasks.push((async () => {
          const { data: claims } = await supabase.from('architect_claims')
            .select('architect_id').eq('user_id', user.id).eq('status', 'verified');
          if (claims) setVerifiedClaims(claims.map(c => c.architect_id));

          const { data: userEntry } = await supabase
            .from("user_buildings")
            .select("*, images:review_images(id, storage_path, is_generated, is_official)")
            .eq("user_id", user.id).eq("building_id", resolvedBuildingId).maybeSingle();

          const { data: collectionItems } = await supabase
            .from("collection_items").select("collection_id, collections(owner_id)").eq("building_id", resolvedBuildingId);

          const myCollectionIds = (collectionItems ?? [])
            .filter((item: { collections: { owner_id: string } | null; collection_id: string }) => item.collections?.owner_id === user.id)
            .map((item) => item.collection_id) || [];

          setSelectedCollectionIds(myCollectionIds);
          setInitialCollectionIds(myCollectionIds);

          if (userEntry) {
            const st = userEntry.status;
            if (st === "visited" || st === "pending" || st === "ignored") setUserStatus(st);
            else setUserStatus(null);
            setMyRating(userEntry.rating || 0);
            setNote(userEntry.content || "");
            setUserImages((userEntry.images ?? []).map((img) => ({
              id: img.id, storage_path: img.storage_path,
              is_generated: img.is_generated ?? undefined, is_official: img.is_official,
            })));
            setIsEditing(false);
            if (userEntry.content || myCollectionIds.length > 0) setShowNoteEditor(true);
            if (myCollectionIds.length > 0) setShowCollections(true);

            const { data: userLinksData } = await supabase
              .from("review_links").select("id, url, title").eq("review_id", userEntry.id);
            if (userLinksData) {
              setUserLinks(userLinksData.map(l => ({ id: l.id, url: l.url, title: l.title ?? "" })));
            }
          } else {
            setIsEditing(true);
          }
        })());
      }

      tasks.push((async () => {
        let followedIds = new Set<string>();
        if (user) {
          const { data: followsData } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
          if (followsData) followedIds = new Set<string>((followsData as { following_id: string }[]).map(f => f.following_id));
        }

        const { data: entriesData, error: entriesError } = await supabase
          .rpc("get_building_reviews", { p_building_id: resolvedBuildingId });

        const communityImages: DisplayImage[] = [];

        if (!entriesError && entriesData) {
          const rawEntries = entriesData as unknown as RpcBuildingReviewRow[];

          if (followedIds.size > 0) {
            const friendEntry = rawEntries.find(e => followedIds.has(e.user_id));
            if (friendEntry) setSocialContext("Saved by contacts");
          }

          rawEntries.forEach(entry => {
            if (entry.video_url) {
              let posterUrl: string | undefined;
              if (entry.images && entry.images.length > 0) {
                posterUrl = getBuildingImageUrl(entry.images[0].storage_path) || undefined;
              }
              communityImages.push({
                id: `video-${entry.id}`, url: entry.video_url, poster: posterUrl, type: 'video',
                likes_count: 0, created_at: entry.created_at, user: entry.user_data
              });
            }

            if (entry.images && entry.images.length > 0) {
              entry.images.forEach(img => {
                const publicUrl = getBuildingImageUrl(img.storage_path);
                if (publicUrl) {
                  communityImages.push({
                    id: img.id, url: publicUrl, type: 'image',
                    likes_count: img.likes_count || 0,
                    created_at: img.created_at || entry.created_at,
                    user: entry.user_data,
                    is_generated: img.is_generated, is_official: img.is_official
                  });
                }
              });
            }
          });

          communityImages.sort((a, b) => {
            if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          const sanitizedEntries: FeedEntry[] = rawEntries.map(e => ({
            id: e.id, user_id: e.user_id, content: e.content ?? null, rating: e.rating ?? null,
            status: e.status ?? "visited", tags: e.tags ?? null, created_at: e.created_at,
            user: {
              username: e.user_data?.username ?? null, avatar_url: e.user_data?.avatar_url ?? null,
              is_verified_architect: e.user_data?.is_verified_architect,
              is_architect_of_building: e.user_data?.is_architect_of_building,
            },
            images: (e.images || []).map(img => ({ id: img.id, storage_path: img.storage_path, created_at: img.created_at })),
          }));

          sanitizedEntries.sort((a, b) => {
            const aFollowed = followedIds.has(a.user_id);
            const bFollowed = followedIds.has(b.user_id);
            if (aFollowed && !bFollowed) return -1;
            if (!aFollowed && bFollowed) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          setEntries(sanitizedEntries);
        }

        if (user && communityImages.length > 0) {
          const imageIds = communityImages.filter(img => img.type === 'image').map(img => img.id);
          if (imageIds.length > 0) {
            const { data: likesData } = await supabase
              .from("image_likes").select("image_id").eq("user_id", user.id).in("image_id", imageIds);
            const likedSet = new Set<string>(
              (likesData as { image_id: string }[] | null | undefined)?.map(l => l.image_id) || []
            );
            setLikedImageIds(likedSet);
          }
        }

        setDisplayImages(communityImages);
      })());

      await Promise.all(tasks);
    } catch (_error: unknown) {
      toast({ variant: "destructive", title: "Error", description: "Building not found" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTopLinks = async (buildingId: string) => {
    setLinksLoading(true);
    const { data: linksData, error: linksError } = await supabase.rpc('get_building_top_links', { p_building_id: buildingId });
    if (!linksError && linksData) {
      const links = linksData as unknown as TopLink[];
      setTopLinks(links);
      if (user && links.length > 0) {
        const linkIds = links.map(l => l.link_id);
        const { data: likes } = await supabase.from('link_likes').select('link_id').eq('user_id', user.id).in('link_id', linkIds);
        if (likes) setLikedLinkIds(new Set(likes.map(l => l.link_id)));
      }
    }
    setLinksLoading(false);
  };

  // ─── HANDLERS ────────────────────────────────────────────────────────────

  const handleLinkLike = async (linkId: string) => {
    if (!user) { toast({ title: "Please sign in to like links" }); return; }
    const isLiked = likedLinkIds.has(linkId);
    const newLiked = new Set(likedLinkIds);
    if (isLiked) {
      newLiked.delete(linkId);
    } else {
      newLiked.add(linkId);
    }
    setLikedLinkIds(newLiked);
    setTopLinks(prev => prev.map(l => l.link_id === linkId ? { ...l, like_count: l.like_count + (isLiked ? -1 : 1) } : l));
    try {
      if (isLiked) await supabase.from("link_likes").delete().eq("link_id", linkId).eq("user_id", user.id);
      else await supabase.from("link_likes").insert({ link_id: linkId, user_id: user.id });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to like link" });
      setLikedLinkIds(likedLinkIds);
      setTopLinks(prev => prev.map(l => l.link_id === linkId ? { ...l, like_count: l.like_count + (isLiked ? 1 : -1) } : l));
    }
  };

  const handleStatusChange = async (newStatus: 'visited' | 'pending' | 'ignored') => {
    if (!user || !building) return;
    if (userStatus === newStatus) {
      const parts: string[] = [];
      if (note) parts.push("your review");
      if (selectedCollectionIds.length > 0) parts.push(`associations with ${selectedCollectionIds.length} collections`);
      if (userImages.length > 0) parts.push(`your ${userImages.length} saved photos/videos`);
      let msg = "You are about to remove this building from your profile.";
      if (parts.length > 0) {
        const last = parts.pop();
        const list = parts.length > 0 ? parts.join(", ") + " and " + last : last;
        msg += ` This will permanently delete ${list}.`;
      } else { msg += " This action cannot be undone."; }
      setDeleteWarningMessage(msg);
      setShowDeleteAlert(true);
      return;
    }
    if (newStatus !== 'ignored') setShowNoteEditor(true);
    setUserStatus(newStatus);
    try {
      const { error } = await supabase.from("user_buildings").upsert({
        user_id: user.id, building_id: building.id, status: newStatus,
        rating: myRating > 0 ? myRating : null, edited_at: new Date().toISOString()
      }, { onConflict: 'user_id, building_id' });
      if (error) throw error;
      const title = newStatus === 'visited' ? "Marked as Visited" : newStatus === 'ignored' ? "Building Hidden" : "Added to Pending";
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
      toast({ title });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to save status" });
      fetchUserSpecificData();
    }
  };

  const handleRate = async (_buildingId: string, rating: number) => {
    if (!user || !building) return;
    setShowNoteEditor(true);
    setMyRating(rating);
    const statusToUse = userStatus || 'visited';
    if (!userStatus) setUserStatus('visited');
    try {
      const { error } = await supabase.from("user_buildings").upsert({
        user_id: user.id, building_id: building.id, status: statusToUse,
        rating: rating > 0 ? rating : null, edited_at: new Date().toISOString()
      }, { onConflict: 'user_id, building_id' });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
      if (rating >= 2) toast({ title: "You just boosted this building's rank!", description: "Thanks for your feedback." });
      else toast({ title: "Rating saved" });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to save rating" });
      fetchUserSpecificData();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      for (const file of Array.from(e.target.files)) {
        try {
          const { file: compressedFile, width, height } =
            await resizeImageWithDimensions(file);
          const previewUrl = URL.createObjectURL(compressedFile);
          setPendingImages(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              file: compressedFile,
              preview: previewUrl,
              is_generated: false,
              width_px: width,
              height_px: height,
            },
          ]);
        } catch (_error) { toast({ variant: "destructive", title: "Error processing image" }); }
      }
      e.target.value = "";
    }
  };

  const removePendingImage = (id: string) => {
    setPendingImages(prev => {
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter(img => img.id !== id);
    });
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { new URL(url); } catch { toast({ variant: "destructive", title: "Invalid URL" }); return; }
    setUserLinks(prev => [...prev, { id: crypto.randomUUID(), url, title: newLinkTitle }]);
    setNewLinkUrl(""); setNewLinkTitle("");
  };

  const handleRemoveLink = (id: string) => setUserLinks(prev => prev.filter(l => l.id !== id));

  const handleSaveNote = async () => {
    if (!user || !building) return;
    setIsSavingNote(true);
    const statusToUse = userStatus || 'visited';
    if (!userStatus) setUserStatus('visited');
    try {
      const { data: savedEntry, error } = await supabase.from("user_buildings").upsert({
        user_id: user.id, building_id: building.id, status: statusToUse,
        rating: myRating > 0 ? myRating : null, content: note, edited_at: new Date().toISOString()
      }, { onConflict: 'user_id, building_id' }).select().single();
      if (error) throw error;
      const reviewId = savedEntry.id;
      const addedIds = selectedCollectionIds.filter(id => !initialCollectionIds.includes(id));
      const removedIds = initialCollectionIds.filter(id => !selectedCollectionIds.includes(id));
      if (addedIds.length > 0) await supabase.from("collection_items").insert(addedIds.map(cId => ({ collection_id: cId, building_id: building.id })));
      if (removedIds.length > 0) await supabase.from("collection_items").delete().in("collection_id", removedIds).eq("building_id", building.id);
      setInitialCollectionIds(selectedCollectionIds);
      if (reviewId) {
        await supabase.from("review_links").delete().eq("review_id", reviewId);
        if (userLinks.length > 0) {
          await supabase.from("review_links").insert(userLinks.map(l => ({ review_id: reviewId, user_id: user.id, url: l.url, title: l.title })));
        }
      }
      if (pendingImages.length > 0 && reviewId) {
        for (const img of pendingImages) {
          const storagePath = await uploadFile(img.file, reviewId);
          await supabase.from("review_images").insert({
            review_id: reviewId,
            user_id: user.id,
            storage_path: storagePath,
            is_generated: img.is_generated,
            width_px: img.width_px,
            height_px: img.height_px,
          });
        }
        pendingImages.forEach(img => URL.revokeObjectURL(img.preview));
        setPendingImages([]);
      }
      toast({ title: "Review saved" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
      fetchUserSpecificData();
    } catch (_error: unknown) {
      toast({ variant: "destructive", title: "Failed to save note" });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !building) return;
    try {
      const { error } = await supabase.from("user_buildings").delete().eq("user_id", user.id).eq("building_id", building.id);
      if (error) throw error;
      if (initialCollectionIds.length > 0) {
        await supabase.from("collection_items").delete().in("collection_id", initialCollectionIds).eq("building_id", building.id);
      }
      setUserStatus(null); setMyRating(0); setNote("");
      setSelectedCollectionIds([]); setInitialCollectionIds([]); setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
      toast({ title: "Removed from list" });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to remove" });
    }
  };

  const handleSendInvites = async () => {
    if (!user || !building || selectedFriends.length === 0) return;
    setSendingInvites(true);
    try {
      const { error: recError } = await supabase.from("recommendations").insert(
        selectedFriends.map(recipientId => ({ recommender_id: user.id, recipient_id: recipientId, building_id: building.id, status: "visit_with" }))
      );
      if (recError) throw recError;
      toast({ title: "Invites sent!", description: `Sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}.` });
      setSelectedFriends([]);
    } catch (error: unknown) {
      toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to send invites." });
    } finally {
      setSendingInvites(false);
    }
  };

  const handleSaveOfficialData = async () => {
    if (!building) return;
    setIsSavingOfficial(true);
    try {
      const { error } = await supabase.from('buildings').update({
        name: draftOfficialData.name, year_completed: draftOfficialData.year_completed,
        city: draftOfficialData.city, country: draftOfficialData.country,
        architect_statement: draftOfficialData.architect_statement
      }).eq('id', building.id);
      if (error) throw error;
      toast({ title: "Building updated successfully" });
      setIsOfficialEditing(false);
      setBuilding(prev => prev ? {
        ...prev, name: draftOfficialData.name, year_completed: draftOfficialData.year_completed,
        city: draftOfficialData.city || null, country: draftOfficialData.country || null,
        architect_statement: draftOfficialData.architect_statement || null,
      } : null);
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to update building" });
    } finally {
      setIsSavingOfficial(false);
    }
  };

  const handleSetHeroImage = async () => {
    if (!selectedImage || !building) return;
    const newHeroId = selectedImage.id;
    const newHeroUrl = selectedImage.url;
    setHeroImageUrl(newHeroUrl);
    setBuilding(prev => prev ? { ...prev, hero_image_id: newHeroId } : null);
    try {
      const { error } = await supabase.from('buildings').update({ hero_image_id: newHeroId }).eq('id', building.id);
      if (error) throw error;
      toast({ title: "Hero image updated" });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to set hero image" });
    }
  };

  const handleToggleOfficial = async () => {
    if (!selectedImage) return;
    const newStatus = !selectedImage.is_official;
    setSelectedImage(prev => prev ? { ...prev, is_official: newStatus } : null);
    setDisplayImages(prev => prev.map(img => img.id === selectedImage.id ? { ...img, is_official: newStatus } : img));
    try {
      const { error } = await supabase.from('review_images').update({ is_official: newStatus }).eq('id', selectedImage.id);
      if (error) throw error;
      toast({ title: newStatus ? "Added to Official Lookbook" : "Removed from Official Lookbook" });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to update lookbook status" });
      setSelectedImage(prev => prev ? { ...prev, is_official: !newStatus } : null);
      setDisplayImages(prev => prev.map(img => img.id === selectedImage.id ? { ...img, is_official: !newStatus } : img));
    }
  };

  const googleSearchUrl = useMemo(() => {
    if (!building) return "";
    const creditPart = visiblePrimaryCredits(buildingCredits)
      .map((c) => {
        const p = c.person?.name;
        const co = c.company?.name;
        if (p && co) return `${p} ${co}`;
        return p ?? co ?? "";
      })
      .filter(Boolean)
      .join(" ");
    const query = [building.name, building.city, creditPart].filter(Boolean).join(" ");
    const params = new URLSearchParams();
    params.set('q', query); params.set('udm', '2');
    return `https://www.google.com/search?${params.toString()}`;
  }, [building, buildingCredits]);

  // ─── GALLERY RENDERER ────────────────────────────────────────────────────

  const renderEditorialGrid = useCallback((images: DisplayImage[]) => {
    if (images.length === 0) return null;
    const [first, second, third, ...rest] = images;

    const FeatureImg = ({ img }: { img: DisplayImage }) => (
      <div className="overflow-hidden w-full h-full cursor-pointer bg-surface-muted" onClick={() => setSelectedImage(img)}>
        {img.type === "video" ? (
          <video src={img.url} poster={img.poster} className="w-full h-full object-cover hover:opacity-90 transition-opacity" muted loop playsInline />
        ) : (
          <img src={img.url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
        )}
      </div>
    );

    return (
      <div>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: second || third ? "3fr 2fr" : "1fr", gridTemplateRows: "280px" }}>
          <FeatureImg img={first} />
          {(second || third) && (
            <div className="grid gap-0.5" style={{ gridTemplateRows: third ? "1fr 1fr" : "1fr" }}>
              {second && <FeatureImg img={second} />}
              {third && <FeatureImg img={third} />}
            </div>
          )}
        </div>
        {rest.length > 0 && (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {rest.map(img => (
              <BuildingImageCard key={img.id} image={img} initialIsLiked={likedImageIds.has(img.id)} onOpen={() => setSelectedImage(img)} />
            ))}
          </div>
        )}
      </div>
    );
  }, [displayImages, likedImageIds]);

  const renderGallery = useCallback(() => {
    const hasOfficial = displayImages.some(img => img.is_official);
    const hasNonOfficial = displayImages.some(img => !img.is_official);
    const officialImages = displayImages.filter(img => img.is_official);
    if (hasOfficial && hasNonOfficial) {
      return (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-3 h-8">
            <TabsTrigger value="all" className="text-xs">All ({displayImages.length})</TabsTrigger>
            <TabsTrigger value="official" className="text-xs">Official ({officialImages.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-0">{renderEditorialGrid(displayImages)}</TabsContent>
          <TabsContent value="official" className="mt-0">{renderEditorialGrid(officialImages)}</TabsContent>
        </Tabs>
      );
    }
    return renderEditorialGrid(displayImages);
  }, [displayImages, renderEditorialGrid]);

  // ─── LOADING / SSR STATES ────────────────────────────────────────────────

  if (loading || !building) {
    return (
      <AppLayout title="Loading...">
        <div className="p-8"><Loader2 className="animate-spin" /></div>
      </AppLayout>
    );
  }

  if (!interactiveUiReady) {
    return (
      <AppLayout title={building.name} showBack>
        <BuildingHero key={heroImageUrl} src={heroImageUrl} alt={building.name} />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <BuildingHeader
              building={building}
              primaryCredits={initialBuildingCredits}
              showEditLink={false}
              isEditing={false}
              nameValue={draftOfficialData.name}
              yearValue={draftOfficialData.year_completed}
              onNameChange={() => {}}
              onYearChange={() => {}}
            />
            <p className="text-base text-text-secondary leading-relaxed">
              {buildingDescription(building, initialBuildingCredits)}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────

  return (
    <AppLayout title={building.name} showBack>

      {/* ── HERO — pure image, no overlay ── */}
      <BuildingHero key={heroImageUrl} src={heroImageUrl} alt={building.name} />

      {/* ── Main content — single column ── */}
      <div className="px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-4xl mx-auto space-y-16">

          {/* ── BUILDING HEADER — editorial scale ── */}
          <div>
            {building.tier_rank && (
              <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary mb-3 block">
                {building.tier_rank}{building.city ? ` · ${building.city}` : ""}
              </span>
            )}

            {isOfficialEditing ? (
              <Input
                value={draftOfficialData.name}
                onChange={(e) => setDraftOfficialData(p => ({ ...p, name: e.target.value }))}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight h-auto px-0 py-2 w-full border-none focus-visible:ring-0 bg-transparent"
                placeholder="Building Name"
              />
            ) : (
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-text-primary">
                {building.name}
              </h1>
            )}

            {building.alt_name && building.alt_name !== building.name && !isOfficialEditing && (
              <p className="text-lg text-text-secondary mt-2">{building.alt_name}</p>
            )}

            {/* Architect · Year · Location */}
            <div className="flex flex-wrap items-center gap-2 mt-4 text-sm text-text-secondary">
              {visiblePrimaryCredits(buildingCredits).length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1">
                    <PrimaryCreditsLinks
                      credits={buildingCredits}
                      linkClassName="font-medium text-text-primary hover:underline"
                    />
                  </div>
                  <span className="text-text-disabled">·</span>
                </>
              )}
              {isOfficialEditing ? (
                <Input type="number" value={draftOfficialData.year_completed}
                  onChange={(e) => setDraftOfficialData(p => ({ ...p, year_completed: parseInt(e.target.value) }))}
                  className="w-20 h-7 text-sm" />
              ) : (
                <span>{building.year_completed}</span>
              )}
              {(building.city || building.country) && (
                <>
                  <span className="text-text-disabled">·</span>
                  <span>{[building.city, building.country].filter(Boolean).join(", ")}</span>
                </>
              )}
            </div>

            {/* Stats */}
            {entries.length > 0 && (
              <div className="flex items-center gap-4 mt-3">
                {avgRating !== null && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[1,2,3].map(i => (
                        <Circle key={i} className={`w-3 h-3 ${i <= Math.round(avgRating) ? "fill-text-primary text-text-primary" : "fill-transparent text-text-disabled"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-text-disabled">{avgRating.toFixed(1)} avg</span>
                  </div>
                )}
                <span className="text-xs text-text-disabled">{visitorCount} {visitorCount === 1 ? "visitor" : "visitors"}</span>
              </div>
            )}

            {/* Inline user actions — minimal row */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border-default">
              <button
                type="button"
                onClick={() => handleStatusChange("visited")}
                className={`text-xs font-medium uppercase tracking-widest transition-colors ${userStatus === "visited" ? "text-text-primary" : "text-text-disabled hover:text-text-primary"}`}
              >
                <Check className={`inline w-4 h-4 mr-1 ${userStatus === "visited" ? "stroke-[2.5px]" : ""}`} />
                Visited
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("pending")}
                className={`text-xs font-medium uppercase tracking-widest transition-colors ${userStatus === "pending" ? "text-text-primary" : "text-text-disabled hover:text-text-primary"}`}
              >
                <Bookmark className={`inline w-4 h-4 mr-1 ${userStatus === "pending" ? "fill-current" : ""}`} />
                Save
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("ignored")}
                className={`text-xs font-medium uppercase tracking-widest transition-colors ${userStatus === "ignored" ? "text-text-primary" : "text-text-disabled hover:text-text-primary"}`}
              >
                <EyeOff className="inline w-4 h-4 mr-1" />
                Hide
              </button>

              {(userStatus === "visited" || userStatus === "pending") && (
                <div className="flex items-center gap-1 ml-2" onMouseLeave={() => setHoverRating(null)}>
                  {[1,2,3].map(i => {
                    const filled = hoverRating !== null ? i <= hoverRating : i <= myRating;
                    return (
                      <Circle key={i}
                        className={`w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity ${filled ? "fill-text-primary text-text-primary" : "fill-transparent text-text-disabled"}`}
                        onMouseEnter={() => setHoverRating(i)}
                        onClick={() => handleRate(building.id, i === myRating ? 0 : i)}
                      />
                    );
                  })}
                </div>
              )}

              <div className="flex-1" />

              <Link
                to={getBuildingUrl(building.id, building.slug, building.short_id) + "/review"}
                className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors"
              >
                Write review →
              </Link>

              {canEditOfficialData && (
                <>
                  {isOfficialEditing ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsOfficialEditing(false)} disabled={isSavingOfficial}
                        className="text-xs text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                      <button type="button" onClick={handleSaveOfficialData} disabled={isSavingOfficial}
                        className="text-xs font-medium text-text-primary hover:text-brand-primary transition-colors">
                        {isSavingOfficial && <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />}Save
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsOfficialEditing(true)}
                      className="text-text-disabled hover:text-text-primary transition-colors" aria-label="Edit official data">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Official data editing panel ── */}
          {isOfficialEditing && (
            <div className="border-t border-border-default pt-6">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-text-disabled mb-4">Editing official data</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-text-secondary">City</Label>
                  <Input value={draftOfficialData.city} onChange={(e) => setDraftOfficialData(p => ({ ...p, city: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-text-secondary">Country</Label>
                  <Input value={draftOfficialData.country} onChange={(e) => setDraftOfficialData(p => ({ ...p, country: e.target.value }))} className="h-8 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* ── Building status alert ── */}
          {(building.status === "Lost" || building.status === "Unbuilt" || building.status === "Under Construction") && (
            <Alert className="border-feedback-destructive/50 bg-feedback-destructive/10 text-feedback-destructive">
              <AlertTriangle className="h-4 w-4 stroke-feedback-destructive" />
              <AlertDescription className="ml-2 font-medium">
                {building.status === "Lost" ? "This building is lost to time. It no longer stands at this location."
                  : building.status === "Unbuilt" ? "This project was never built."
                  : "This building is under construction."}
              </AlertDescription>
            </Alert>
          )}

          {/* ── Architect Statement ── */}
          <ArchitectStatement
            statement={draftOfficialData.architect_statement}
            isEditing={isOfficialEditing}
            onChange={(val) => setDraftOfficialData(p => ({ ...p, architect_statement: val }))}
            architectName={leadAttributionFromCredits(buildingCredits)}
          />

          {/* ── About — attributes, no card container ── */}
          <section className="border-t border-border-default pt-10">
            <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary mb-6">About</h2>
            <BuildingAttributes building={building} />
            {(accessSynthesis || building.access_notes) && (
              <div className="mt-6 space-y-2">
                {accessSynthesis && (
                  <Badge variant={accessBadgeVariant()} className="flex items-center gap-1.5 w-fit">
                    {createElement(accessSynthesis.icon, { className: "w-3.5 h-3.5" })}
                    {accessSynthesis.label}
                  </Badge>
                )}
                {building.access_notes && (
                  <div className="text-sm text-text-secondary border-l-2 border-text-primary/20 pl-3 py-1">{building.access_notes}</div>
                )}
              </div>
            )}
          </section>

          <BuildingCredits buildingId={building.id} credits={buildingCredits} isAuthenticated={Boolean(user)} />

          {/* ── Photo Gallery ── */}
          <section className="border-t border-border-default pt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Photos{displayImages.length > 0 ? ` · ${displayImages.length}` : ""}
              </h2>
              <button type="button" className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                onClick={() => document.getElementById("hidden-file-input")?.click()}>
                Upload →
              </button>
              <input id="hidden-file-input" type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} aria-label="Upload photos of this building" />
            </div>

            {pendingImages.length > 0 && user && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {pendingImages.map((img) => (
                  <div key={img.id} className="relative h-16 w-16 shrink-0 bg-surface-muted">
                    <img src={img.preview} alt="" className="h-full w-full object-cover" />
                    <button type="button"
                      className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-surface-overlay text-text-primary hover:bg-surface-muted"
                      onClick={() => removePendingImage(img.id)} aria-label="Remove pending photo">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button type="button" disabled={isSavingNote}
                  className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors disabled:opacity-50"
                  onClick={() => { void handleSaveNote(); }}>
                  {isSavingNote ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                  Save photos →
                </button>
              </div>
            )}

            <WidgetErrorBoundary>
              {displayImages.length > 0 ? renderGallery() : (
                <div className="aspect-[16/9] flex flex-col items-center justify-center text-text-secondary text-center p-6 bg-surface-muted/20">
                  <ImageIcon className="w-10 h-10 text-text-disabled mb-3" />
                  <p className="text-xs text-text-disabled mb-4">Be the first to add a photo</p>
                  <Link to={getBuildingUrl(building.id, building.slug, building.short_id) + "/review"}
                    className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors">
                    Upload photo →
                  </Link>
                </div>
              )}
            </WidgetErrorBoundary>

            <div className="mt-3 text-center">
              <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-text-disabled hover:text-text-primary transition-colors">
                <Search className="w-3 h-3" />Search for photos on Google<ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            </div>
          </section>

          {/* ── Location ── */}
          <section className="border-t border-border-default pt-10">
            <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary mb-4">Location</h2>

            {building.location_precision === "approximate" && (
              <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-500 mb-4">
                <AlertTriangle className="h-4 w-4 stroke-amber-500" />
                <AlertDescription className="ml-2">Exact location not verified. This marker indicates the general village/locality.</AlertDescription>
              </Alert>
            )}

            {coordinates ? (
              <WidgetErrorBoundary>
                <BuildingLocationMap
                  lat={coordinates.lat} lng={coordinates.lng} status={userStatus} rating={myRating}
                  tierRank={building.tier_rank} locationPrecision={building.location_precision}
                  isExpanded={isMapExpanded} onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                  className={isMapExpanded ? "" : "h-52 w-full"}
                />
              </WidgetErrorBoundary>
            ) : (
              <div className="h-48 bg-surface-muted/20 flex flex-col items-center justify-center gap-2 text-text-secondary">
                <MapPin className="w-6 h-6 opacity-50" />
                <span className="text-xs uppercase tracking-widest">Location Unavailable</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-2 text-text-secondary text-sm group">
                <MapPin className="w-4 h-4 shrink-0" />
                {isOfficialEditing ? (
                  <div className="flex gap-2">
                    <Input value={draftOfficialData.city} onChange={(e) => setDraftOfficialData(p => ({ ...p, city: e.target.value }))} placeholder="City" className="h-8 text-sm w-28" />
                    <Input value={draftOfficialData.country} onChange={(e) => setDraftOfficialData(p => ({ ...p, country: e.target.value }))} placeholder="Country" className="h-8 text-sm w-28" />
                  </div>
                ) : (
                  <span>{[building.city, building.country].filter(Boolean).join(", ") || building.address}</span>
                )}
                {user && !isOfficialEditing && (
                  <Link to={getBuildingUrl(building.id, building.slug, building.short_id) + "/edit"} className="hidden group-hover:inline-flex items-center justify-center p-1 hover:bg-surface-muted text-text-disabled hover:text-text-primary transition-colors ml-1" title="Edit building">
                    <Pencil className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {coordinates && (
                <>
                  <button type="button"
                    className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                    onClick={() => {
                      if (building.location_precision === "approximate") setShowDirectionsAlert(true);
                      else window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`, "_blank");
                    }}
                  >
                    {building.status === "Lost" ? "Navigate to site →" : "Get directions →"}
                  </button>

                  <AlertDialog open={showDirectionsAlert} onOpenChange={setShowDirectionsAlert}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Exact Location Unknown</AlertDialogTitle>
                        <AlertDialogDescription>
                          This building&apos;s location is approximate. The directions will guide you to the general vicinity (e.g. village center).<br /><br />Please look around when you arrive.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`, "_blank")}>
                          {building.status === "Lost" ? "Navigate to Site" : "Get Directions"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </section>

          {/* ── Resources — no card container ── */}
          {(linksLoading || topLinks.length > 0) && (
            <section className="border-t border-border-default pt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">Resources</h2>
                {user && (
                  <button type="button" onClick={() => setShowLinkEditor(!showLinkEditor)}
                    className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">
                    Add →
                  </button>
                )}
              </div>
              {linksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : (
                <div className="space-y-0">
                  {topLinks.map(link => {
                    let domain = "";
                    try { domain = new URL(link.url).hostname; } catch { /* ignore */ }
                    const displayDomain = domain || link.url;
                    const hasTitle = !!link.title;
                    const isLiked = likedLinkIds.has(link.link_id);
                    return (
                      <div key={link.link_id} className="flex items-center justify-between py-3 border-b border-border-default group">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col gap-0.5 overflow-hidden min-w-0">
                          <span className="font-medium truncate text-sm text-text-primary group-hover:text-brand-primary transition-colors">{hasTitle ? link.title : displayDomain}</span>
                          <div className="flex items-center gap-1.5 text-xs text-text-disabled">
                            {hasTitle && <span className="truncate max-w-[150px]">{displayDomain}</span>}
                            {hasTitle && link.user_username && <span>·</span>}
                            {link.user_username && <span>@{link.user_username}</span>}
                          </div>
                        </a>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <button type="button"
                            className={`inline-flex items-center gap-1 text-xs transition-colors ${isLiked ? "text-text-primary" : "text-text-disabled hover:text-text-primary"}`}
                            onClick={(e) => { e.preventDefault(); handleLinkLike(link.link_id); }}>
                            <Heart className={`w-3 h-3 ${isLiked ? "fill-current" : ""}`} />
                            <span>{link.like_count}</span>
                          </button>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-text-disabled hover:text-text-primary transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                  {showLinkEditor && user && (
                    <div className="pt-4 space-y-2">
                      {userLinks.length > 0 && (
                        <ul className="space-y-1.5 text-sm text-text-secondary">
                          {userLinks.map((l) => (
                            <li key={l.id} className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate">{l.title || l.url}</span>
                              <button type="button" onClick={() => handleRemoveLink(l.id)} className="text-text-disabled hover:text-text-primary transition-colors" aria-label="Remove link">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Input placeholder="URL" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="h-8 text-sm" />
                      <Input placeholder="Title (optional)" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} className="h-8 text-sm" />
                      <button type="button" onClick={handleAddLink}
                        className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors">
                        Add link →
                      </button>
                      {(userLinks.length > 0 || selectedCollectionIds.length !== initialCollectionIds.length) && (
                        <button type="button" disabled={isSavingNote}
                          className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors disabled:opacity-50 block mt-2"
                          onClick={() => { void handleSaveNote(); }}>
                          {isSavingNote ? <Loader2 className="h-3 w-3 mr-1 animate-spin inline" /> : null}
                          Save links →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Add to collection / Visit with friend ── */}
          {user && (
            <section className="border-t border-border-default pt-10 space-y-6">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setShowCollections(!showCollections)}
                  className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">
                  <Plus className="inline w-3.5 h-3.5 mr-1" />Add to collection
                </button>
                <button type="button" onClick={() => setShowVisitWith(!showVisitWith)}
                  className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">
                  <Users className="inline w-3.5 h-3.5 mr-1" />Plan a visit
                </button>
              </div>

              {showCollections && (
                <CollectionSelector
                  userId={user.id}
                  selectedCollectionIds={selectedCollectionIds}
                  onChange={setSelectedCollectionIds}
                />
              )}

              {showVisitWith && (
                <div className="space-y-3">
                  <UserPicker
                    selectedIds={selectedFriends}
                    onSelect={(friendId) => setSelectedFriends((prev) => (prev.includes(friendId) ? prev : [...prev, friendId]))}
                    onRemove={(friendId) => setSelectedFriends((prev) => prev.filter((x) => x !== friendId))}
                  />
                  {selectedFriends.length > 0 && (
                    <button type="button" onClick={handleSendInvites} disabled={sendingInvites}
                      className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors disabled:opacity-50">
                      {sendingInvites ? <Loader2 className="w-3 h-3 mr-1 animate-spin inline" /> : <Send className="inline w-3.5 h-3.5 mr-1" />}
                      Send invite →
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── COMMUNITY REVIEWS — editorial list ── */}
          <section className="border-t border-border-default pt-10">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Community reviews{entries.length > 0 ? ` · ${entries.length}` : ""}
              </h2>
            </div>

            {entries.length === 0 ? (
              <p className="text-sm text-text-disabled">No reviews yet.</p>
            ) : (
              <div className="space-y-0">
                {entries.map(entry => (
                  <div key={entry.id} className={`flex gap-4 py-6 border-b border-border-default ${entry.user.is_architect_of_building ? "border-l-[3px] border-l-text-primary pl-4" : ""}`}>
                    <Avatar className="flex-shrink-0 w-8 h-8">
                      <AvatarImage src={entry.user.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{entry.user.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/profile/${entry.user.username || entry.user_id}`} className="font-semibold text-sm text-text-primary hover:underline">
                          {entry.user.username}
                        </Link>
                        {entry.user.is_verified_architect && (
                          <BadgeCheck className="w-3.5 h-3.5 text-text-primary" />
                        )}
                        {entry.status === "visited" && <span className="text-2xs font-medium uppercase tracking-widest text-text-disabled">Visited</span>}
                        {entry.status === "pending" && <span className="text-2xs font-medium uppercase tracking-widest text-text-disabled">Saved</span>}
                      </div>
                      <Link to={`/review/${entry.id}`} className="block group mt-1">
                        {entry.rating && (
                          <div className="flex items-center gap-0.5 mb-1">
                            {[...Array(3)].map((_, i) => (
                              <Circle key={i} className={`w-3 h-3 ${i < entry.rating! ? "fill-text-primary text-text-primary" : "fill-transparent text-text-disabled"}`} />
                            ))}
                          </div>
                        )}
                        {entry.content && (
                          <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-relaxed">{entry.content}</p>
                        )}
                      </Link>
                      {entry.images && entry.images.length > 0 && (
                        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                          {entry.images.map(img => {
                            const publicUrl = getBuildingImageUrl(img.storage_path);
                            if (!publicUrl) return null;
                            const displayImg: DisplayImage = { id: img.id, url: publicUrl, likes_count: 0, created_at: img.created_at || entry.created_at, user: entry.user };
                            return (
                              <img key={img.id} src={publicUrl} className="h-20 w-20 object-cover rounded-none bg-surface-muted cursor-pointer hover:opacity-90 transition-opacity" alt="Review photo" onClick={() => setSelectedImage(displayImg)} />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <ImageDetailsDialog
        imageId={selectedImage?.id || null}
        initialUrl={selectedImage?.url || null}
        type={selectedImage?.type || 'image'}
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
              {deleteWarningMessage || "This will delete your rating, status, and any notes for this building. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-feedback-destructive text-feedback-destructive-foreground hover:opacity-90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}