/**
 * useBuildingInteractions
 *
 * Owns all data-fetching, mutation state, and event handlers for the building
 * detail page (official field edits use `/building/:id/:slug/edit`). The component keeps only:
 *   - loader / router concerns (useLoaderData, useParams)
 *   - buildingCredits query + derived auth values
 *   - pure UI toggles with no async logic (isMapExpanded)
 *   - render functions + JSX
 *
 * File location: src/features/buildings/hooks/useBuildingInteractions.ts
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/utils/upload";
import { resizeImageWithDimensions } from "@/lib/image-compression";
import { getBuildingImageUrl } from "@/utils/image";
import { parseLocation } from "@/utils/location";
import { synthesizeAccess } from "@/utils/accessSynthesis";
import { visiblePrimaryCredits } from "@/features/credits/buildingCreditDisplay";
import type { BuildingCreditWithEntities } from "@/features/credits/types";
import type { BuildingDetails } from "@/features/buildings/pages/BuildingDetails";
import type { User } from "@supabase/supabase-js";

/** Minimal profile shape the hook needs — avoids importing the full Profile type. */
type ProfileForHook = { role?: string | null } | null | undefined;

// ─── Types (local to hook, mirrored from BuildingDetails) ────────────────────

export interface TopLink {
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
    caption?: string | null;
  }>;
  video_url?: string | null;
  content?: string | null;
  rating?: number | null;
  status?: FeedEntry["status"];
  tags?: string[] | null;
}

export interface DisplayImage {
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

// ─── Hook inputs ─────────────────────────────────────────────────────────────

interface UseBuildingInteractionsInput {
  /** Reactive loader building — hook syncs its own copy when this changes. */
  loaderBuilding: BuildingDetails | null;
  initialHeroImageUrl: string | null;
  buildingCredits: BuildingCreditWithEntities[];
  /**
   * Stable fingerprint of buildingCredits contents. Pass the same value used
   * in BuildingDetails so the fetch effect re-runs when credits change.
   */
  buildingCreditsFingerprint: string;
  user: User | null;
  /** Used to derive canEditOfficialData and isCreditsAdmin. */
  profile: ProfileForHook;
}

// ─── Hook return ─────────────────────────────────────────────────────────────

export interface BuildingInteractions {
  // Building state (hook owns mutations via handleSetHeroImage / lookbook toggles)
  building: BuildingDetails | null;
  heroImageUrl: string | null;

  // Loading
  loading: boolean;

  // User relationship to this building
  isCreator: boolean;
  userStatus: "visited" | "pending" | "ignored" | null;
  myRating: number;
  hoverRating: number | null;
  setHoverRating: (r: number | null) => void;

  // Community data
  entries: FeedEntry[];
  displayImages: DisplayImage[];
  selectedImage: DisplayImage | null;
  setSelectedImage: (img: DisplayImage | null) => void;
  likedImageIds: Set<string>;
  selectedIndex: number;

  // Links
  topLinks: TopLink[];
  likedLinkIds: Set<string>;
  linksLoading: boolean;
  userLinks: { id: string; url: string; title: string }[];
  showLinkEditor: boolean;
  setShowLinkEditor: (v: boolean) => void;
  newLinkUrl: string;
  setNewLinkUrl: (v: string) => void;
  newLinkTitle: string;
  setNewLinkTitle: (v: string) => void;

  // Notes / images
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  /** ID of the post currently loaded in the editor, or null for a new note. */
  activePostId: string | null;
  /** All of the user's posts for this building, newest first. */
  userPosts: { id: string; title: string | null; body: string | null; created_at: string; updated_at: string; images: { id: string; storage_path: string }[] }[];
  pendingImages: Array<{
    id: string;
    file: File;
    preview: string;
    is_generated: boolean;
    width_px: number | null;
    height_px: number | null;
  }>;
  isSavingNote: boolean;

  // Collections
  showCollections: boolean;
  setShowCollections: (v: boolean) => void;
  selectedCollectionIds: string[];
  setSelectedCollectionIds: (ids: string[]) => void;
  initialCollectionIds: string[];

  // Visit-with
  showVisitWith: boolean;
  setShowVisitWith: (v: boolean) => void;
  selectedFriends: string[];
  setSelectedFriends: React.Dispatch<React.SetStateAction<string[]>>;
  sendingInvites: boolean;

  /** When true, the optional note textarea is shown (auto-opened after status/rating updates; otherwise via "Add note"). */
  noteEditorOpen: boolean;
  setNoteEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Delete confirmation
  showDeleteAlert: boolean;
  setShowDeleteAlert: (v: boolean) => void;
  deleteWarningMessage: string;

  // Derived / computed
  /** Sum of `rating` across entries that have a rating (1–3); null if none rated. */
  totalRatingPoints: number | null;
  visitorCount: number;
  coordinates: { lat: number; lng: number } | null;
  googleSearchUrl: string;
  accessSynthesis: ReturnType<typeof synthesizeAccess> | null;
  accessBadgeVariant: () => "default" | "success" | "warning" | "brand";
  /** True when the current user may edit official building data. */
  canEditOfficialData: boolean;
  /** True when the current user has admin/app_admin role. */
  isCreditsAdmin: boolean;

  // Handlers
  handleStatusChange: (status: "visited" | "pending" | "ignored") => Promise<void>;
  handleRate: (buildingId: string, rating: number) => Promise<void>;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removePendingImage: (id: string) => void;
  /** Drop all not-yet-saved photo attachments; revokes their blob URLs. Call on Cancel. */
  clearPendingImages: () => void;
  handleAddLink: () => void;
  handleRemoveLink: (id: string) => void;
  handleSaveNote: () => Promise<void>;
  handleSelectPost: (id: string) => Promise<void>;
  handleNewNote: () => void;
  handleDelete: () => Promise<void>;
  handleSendInvites: () => Promise<void>;
  handleSetHeroImage: () => Promise<void>;
  handleToggleOfficial: () => Promise<void>;
  handleLinkLike: (linkId: string) => Promise<void>;
  handleNextImage: () => void;
  handlePrevImage: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBuildingInteractions({
  loaderBuilding,
  initialHeroImageUrl,
  buildingCredits,
  buildingCreditsFingerprint,
  user,
  profile,
}: UseBuildingInteractionsInput): BuildingInteractions {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  // ── Building state (mutable copy for hero / lookbook updates on this page) ────
  const [building, setBuilding] = useState<BuildingDetails | null>(
    () => loaderBuilding ?? null,
  );
  useEffect(() => {
    if (loaderBuilding) setBuilding(loaderBuilding);
  }, [loaderBuilding]);

  const buildingRef = useRef(building);
  buildingRef.current = building;

  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(
    initialHeroImageUrl,
  );

  // ── Core loading ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  /** Avoid full-page spinner on background refetches (credits/user deps, etc.). */
  const lastSuccessfulLoadBuildingId = useRef<string | null>(null);

  // ── User relationship ────────────────────────────────────────────────────
  const [isCreator, setIsCreator] = useState(false);
  const [userStatus, setUserStatus] = useState<
    "visited" | "pending" | "ignored" | null
  >(null);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // ── Community data ───────────────────────────────────────────────────────
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [displayImages, setDisplayImages] = useState<DisplayImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<DisplayImage | null>(null);
  const [likedImageIds, setLikedImageIds] = useState<Set<string>>(new Set());

  const selectedIndex = useMemo(() => {
    if (!selectedImage) return -1;
    return displayImages.findIndex((img) => img.id === selectedImage.id);
  }, [selectedImage, displayImages]);

  const handleNextImage = useCallback(() => {
    if (selectedIndex < displayImages.length - 1)
      setSelectedImage(displayImages[selectedIndex + 1]);
  }, [selectedIndex, displayImages]);

  const handlePrevImage = useCallback(() => {
    if (selectedIndex > 0) setSelectedImage(displayImages[selectedIndex - 1]);
  }, [selectedIndex, displayImages]);

  // ── Links ────────────────────────────────────────────────────────────────
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [likedLinkIds, setLikedLinkIds] = useState<Set<string>>(new Set());
  const [linksLoading, setLinksLoading] = useState(true);
  const [userLinks, setUserLinks] = useState<
    { id: string; url: string; title: string }[]
  >([]);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");

  // ── Notes / images ───────────────────────────────────────────────────────
  const [note, setNote] = useState("");
  /** ID of the building_posts row currently open in the editor (null = new). */
  const [activePostId, setActivePostId] = useState<string | null>(null);
  /** All of this user's building_posts for this building, newest first. */
  const [userPosts, setUserPosts] = useState<
    { id: string; title: string | null; body: string | null; created_at: string; updated_at: string; images: { id: string; storage_path: string }[] }[]
  >([]);
  const [pendingImages, setPendingImages] = useState<
    Array<{
      id: string;
      file: File;
      preview: string;
      is_generated: boolean;
      width_px: number | null;
      height_px: number | null;
    }>
  >([]);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);

  // ── Collections ──────────────────────────────────────────────────────────
  const [showCollections, setShowCollections] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(
    [],
  );
  const [initialCollectionIds, setInitialCollectionIds] = useState<string[]>(
    [],
  );

  // ── Visit-with ───────────────────────────────────────────────────────────
  const [showVisitWith, setShowVisitWith] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  // ── Delete confirmation ──────────────────────────────────────────────────
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState("");

  // ── Verified architect detection ─────────────────────────────────────────
  const [_verifiedClaims, setVerifiedClaims] = useState<string[]>([]);
  const [_hasVerifiedArchitect, setHasVerifiedArchitect] = useState(false);

  // ── Visitor count (separate from entries — building_posts has multiple rows per user) ──
  const [visitorCount, setVisitorCount] = useState(0);

  const totalRatingPoints = useMemo(() => {
    const rated = entries.filter((e) => e.rating != null);
    if (rated.length === 0) return null;
    return rated.reduce((sum, e) => sum + e.rating!, 0);
  }, [entries]);

  const coordinates = useMemo(
    () => parseLocation(building?.location),
    [building],
  );

  const accessSynthesis = useMemo(() => {
    if (
      !building ||
      (!building.access_level &&
        !building.access_logistics &&
        !building.access_cost)
    )
      return null;
    return synthesizeAccess(
      building.access_level || null,
      building.access_logistics || null,
      building.access_cost || null,
    );
  }, [building]);

  const accessBadgeVariant = useCallback(
    (): "default" | "success" | "warning" | "brand" => {
      const level = building?.access_level;
      if (level === "public") return "success";
      if (level === "commercial") return "brand";
      if (level === "private" || level === "restricted") return "warning";
      if (accessSynthesis?.variant === "warning") return "warning";
      if (accessSynthesis?.variant === "outline") return "brand";
      return "default";
    },
    [building, accessSynthesis],
  );

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
    const query = [building.name, building.city, creditPart]
      .filter(Boolean)
      .join(" ");
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("udm", "2");
    return `https://www.google.com/search?${params.toString()}`;
  }, [building, buildingCredits]);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchTopLinks = useCallback(
    async (buildingId: string) => {
      setLinksLoading(true);
      const { data: linksData, error: linksError } = await supabase.rpc(
        "get_building_top_links",
        { p_building_id: buildingId },
      );
      if (!linksError && linksData) {
        const links = linksData as unknown as TopLink[];
        setTopLinks(links);
        if (userId && links.length > 0) {
          const linkIds = links.map((l) => l.link_id);
          const { data: likes } = await supabase
            .from("link_likes")
            .select("link_id")
            .eq("user_id", userId)
            .in("link_id", linkIds);
          if (likes) setLikedLinkIds(new Set(likes.map((l) => l.link_id)));
        }
      }
      setLinksLoading(false);
    },
    [userId],
  );

  const fetchUserSpecificData = useCallback(async () => {
    const b = buildingRef.current;
    if (!b) return;
    const showFullPageLoad = lastSuccessfulLoadBuildingId.current !== b.id;
    if (showFullPageLoad) setLoading(true);
    try {
      const resolvedBuildingId = b.id;

      if (userId && b.created_by === userId) setIsCreator(true);

      const tasks: Promise<void>[] = [];

      // Check whether a verified architect has already claimed this building
      const personIdsForVerified = visiblePrimaryCredits(buildingCredits)
        .map((c) => c.personId)
        .filter((pid): pid is string => pid != null);

      if (personIdsForVerified.length > 0) {
        tasks.push(
          (async () => {
            const { data: verifiedProfiles } = await supabase
              .from("profiles")
              .select("id")
              .in("verified_architect_id", personIdsForVerified)
              .limit(1);
            setHasVerifiedArchitect(
              !!(verifiedProfiles && verifiedProfiles.length > 0),
            );
          })(),
        );
      } else {
        setHasVerifiedArchitect(false);
      }

      tasks.push(fetchTopLinks(resolvedBuildingId));

      // Visitor count: count distinct users who have visited this building
      tasks.push(
        (async () => {
          const { count } = await supabase
            .from("user_buildings")
            .select("id", { count: "exact", head: true })
            .eq("building_id", resolvedBuildingId)
            .eq("status", "visited");
          setVisitorCount(count ?? 0);
        })(),
      );

      if (userId) {
        tasks.push(
          (async () => {
            // Verified architect claims for this user
            const { data: claims } = await supabase
              .from("architect_claims")
              .select("architect_id")
              .eq("user_id", userId)
              .eq("status", "verified");
            if (claims) setVerifiedClaims(claims.map((c) => c.architect_id));

            // User's status/rating from user_buildings
            const { data: userEntry } = await supabase
              .from("user_buildings")
              .select("id, status, rating")
              .eq("user_id", userId)
              .eq("building_id", resolvedBuildingId)
              .maybeSingle();

            // All of this user's building_posts for this building, newest first.
            // We deliberately do NOT use the PostgREST `review_images(...)` embed
            // here: when the FK target was swapped from user_buildings to
            // building_posts in migration 20270872 the production schema cache
            // started silently returning `[]` for the embed even when rows
            // exist. Two queries + manual merge is cache-immune.
            const { data: allPosts } = await supabase
              .from("building_posts")
              .select("id, title, body, created_at, updated_at")
              .eq("user_id", userId)
              .eq("building_id", resolvedBuildingId)
              .order("updated_at", { ascending: false })
              .limit(20);
            const latestPost = allPosts?.[0] ?? null;

            const postIds = (allPosts ?? []).map((p) => p.id);
            const imagesByPost = new Map<
              string,
              { id: string; storage_path: string }[]
            >();
            if (postIds.length > 0) {
              const { data: imgRows } = await supabase
                .from("review_images")
                .select("id, storage_path, review_id")
                .in("review_id", postIds);
              (imgRows ?? []).forEach((img) => {
                const list = imagesByPost.get(img.review_id) ?? [];
                list.push({ id: img.id, storage_path: img.storage_path });
                imagesByPost.set(img.review_id, list);
              });
            }

            // User's collections containing this building
            const { data: collectionItems } = await supabase
              .from("collection_items")
              .select("collection_id, collections(owner_id)")
              .eq("building_id", resolvedBuildingId);

            const myCollectionIds = (collectionItems ?? [])
              .filter(
                (
                  item: {
                    collections: { owner_id: string } | null;
                    collection_id: string;
                  },
                ) => item.collections?.owner_id === userId,
              )
              .map((item) => item.collection_id);

            setSelectedCollectionIds(myCollectionIds);
            setInitialCollectionIds(myCollectionIds);

            if (userEntry) {
              const st = userEntry.status;
              if (st === "visited" || st === "pending" || st === "ignored")
                setUserStatus(st);
              else setUserStatus(null);
              setMyRating(userEntry.rating || 0);
            }

            setUserPosts(
              (allPosts ?? []).map((p) => ({
                id: p.id,
                title: p.title ?? null,
                body: p.body,
                created_at: p.created_at ?? "",
                updated_at: p.updated_at ?? p.created_at ?? "",
                images: imagesByPost.get(p.id) ?? [],
              })),
            );

            if (latestPost) {
              setActivePostId(latestPost.id);
              setNote(latestPost.body || "");

              const { data: userLinksData } = await supabase
                .from("review_links")
                .select("id, url, title")
                .eq("review_id", latestPost.id);
              if (userLinksData) {
                setUserLinks(
                  userLinksData.map((l) => ({
                    id: l.id,
                    url: l.url,
                    title: l.title ?? "",
                  })),
                );
              }
            } else {
              setActivePostId(null);
              setNote("");
              setUserPosts([]);
            }
          })(),
        );
      }

      // Community reviews + images
      tasks.push(
        (async () => {
          let followedIds = new Set<string>();
          if (userId) {
            const { data: followsData } = await supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", userId);
            if (followsData)
              followedIds = new Set<string>(
                (followsData as { following_id: string }[]).map(
                  (f) => f.following_id,
                ),
              );
          }

          const { data: entriesData, error: entriesError } = await supabase.rpc(
            "get_building_reviews",
            { p_building_id: resolvedBuildingId },
          );

          const communityImages: DisplayImage[] = [];

          if (!entriesError && entriesData) {
            const rawEntries = entriesData as unknown as RpcBuildingReviewRow[];

            rawEntries.forEach((entry) => {
              // Video entries
              if (entry.video_url) {
                let posterUrl: string | undefined;
                if (entry.images && entry.images.length > 0) {
                  posterUrl =
                    getBuildingImageUrl(entry.images[0].storage_path) ||
                    undefined;
                }
                communityImages.push({
                  id: `video-${entry.id}`,
                  url: entry.video_url,
                  poster: posterUrl,
                  type: "video",
                  likes_count: 0,
                  created_at: entry.created_at,
                  user: entry.user_data,
                });
              }
              // Image entries
              if (entry.images && entry.images.length > 0) {
                entry.images.forEach((img) => {
                  const publicUrl = getBuildingImageUrl(img.storage_path);
                  if (publicUrl) {
                    communityImages.push({
                      id: img.id,
                      url: publicUrl,
                      type: "image",
                      likes_count: img.likes_count || 0,
                      created_at: img.created_at || entry.created_at,
                      user: entry.user_data,
                      is_generated: img.is_generated,
                      is_official: img.is_official,
                      caption: img.caption,
                    });
                  }
                });
              }
            });

            communityImages.sort((a, b) => {
              if (b.likes_count !== a.likes_count)
                return b.likes_count - a.likes_count;
              return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
              );
            });

            const sanitizedEntries: FeedEntry[] = rawEntries.map((e) => ({
              id: e.id,
              user_id: e.user_id,
              content: e.content ?? null,
              rating: e.rating ?? null,
              status: e.status ?? "visited",
              tags: e.tags ?? null,
              created_at: e.created_at,
              user: {
                username: e.user_data?.username ?? null,
                avatar_url: e.user_data?.avatar_url ?? null,
                is_verified_architect: e.user_data?.is_verified_architect,
                is_architect_of_building:
                  e.user_data?.is_architect_of_building,
              },
              images: (e.images || []).map((img) => ({
                id: img.id,
                storage_path: img.storage_path,
                created_at: img.created_at,
              })),
            }));

            sanitizedEntries.sort((a, b) => {
              const aFollowed = followedIds.has(a.user_id);
              const bFollowed = followedIds.has(b.user_id);
              if (aFollowed && !bFollowed) return -1;
              if (!aFollowed && bFollowed) return 1;
              return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
              );
            });

            setEntries(sanitizedEntries);
          }

          // Resolve which images the current user has liked
          if (userId && communityImages.length > 0) {
            const imageIds = communityImages
              .filter((img) => img.type === "image")
              .map((img) => img.id);
            if (imageIds.length > 0) {
              const { data: likesData } = await supabase
                .from("image_likes")
                .select("image_id")
                .eq("user_id", userId)
                .in("image_id", imageIds);
              setLikedImageIds(
                new Set<string>(
                  (
                    likesData as
                      | { image_id: string }[]
                      | null
                      | undefined
                  )?.map((l) => l.image_id) || [],
                ),
              );
            }
          }

          setDisplayImages(communityImages);
        })(),
      );

                await Promise.all(tasks);
      lastSuccessfulLoadBuildingId.current = b.id;
    } catch (_error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load building data",
      });
    } finally {
      setLoading(false);
    }
  }, [building?.id, buildingCreditsFingerprint, fetchTopLinks, toast, userId]);

  useEffect(() => {
    void fetchUserSpecificData();
  }, [fetchUserSpecificData]);

  useEffect(() => {
    setNoteEditorOpen(false);
    setPendingImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
  }, [building?.id, user?.id]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (newStatus: "visited" | "pending" | "ignored") => {
      if (!user || !building) return;

      // Tapping the active status → confirm delete
      if (userStatus === newStatus) {
        const parts: string[] = [];
        if (note) parts.push("your review");
        if (selectedCollectionIds.length > 0)
          parts.push(
            `associations with ${selectedCollectionIds.length} collections`,
          );
        let msg = "You are about to remove this building from your profile.";
        if (parts.length > 0) {
          const last = parts.pop();
          const list =
            parts.length > 0 ? parts.join(", ") + " and " + last : last;
          msg += ` This will permanently delete ${list}.`;
        } else {
          msg += " This action cannot be undone.";
        }
        setDeleteWarningMessage(msg);
        setShowDeleteAlert(true);
        return;
      }

      setUserStatus(newStatus);
      try {
        const { error } = await supabase.from("user_buildings").upsert(
          {
            user_id: user.id,
            building_id: building.id,
            status: newStatus,
            rating: myRating > 0 ? myRating : null,
          },
          { onConflict: "user_id, building_id" },
        );
        if (error) throw error;
        setNoteEditorOpen(true);
        const title =
          newStatus === "visited"
            ? "Marked as Visited"
            : newStatus === "ignored"
            ? "Building Hidden"
            : "Added to Pending";
        queryClient.invalidateQueries({
          queryKey: ["user-building-statuses"],
        });
        queryClient.invalidateQueries({ queryKey: ["map-clusters-v3"] });
        toast({ title });
      } catch (_error) {
        toast({ variant: "destructive", title: "Failed to save status" });
        void fetchUserSpecificData();
      }
    },
    [
      user,
      building,
      userStatus,
      myRating,
      note,
      selectedCollectionIds,
      fetchUserSpecificData,
      queryClient,
      toast,
    ],
  );

  const handleRate = useCallback(
    async (_buildingId: string, rating: number) => {
      if (!user || !building) return;
      setMyRating(rating);
      const statusToUse = userStatus || "visited";
      if (!userStatus) setUserStatus("visited");
      try {
        const { error } = await supabase.from("user_buildings").upsert(
          {
            user_id: user.id,
            building_id: building.id,
            status: statusToUse,
            rating: rating > 0 ? rating : null,
          },
          { onConflict: "user_id, building_id" },
        );
        if (error) throw error;
        setNoteEditorOpen(true);
        queryClient.invalidateQueries({
          queryKey: ["user-building-statuses"],
        });
        queryClient.invalidateQueries({ queryKey: ["map-clusters-v3"] });
        if (rating >= 2)
          toast({
            title: "You just boosted this building's rank!",
            description: "Thanks for your feedback.",
          });
        else toast({ title: "Rating saved" });
      } catch (_error) {
        toast({ variant: "destructive", title: "Failed to save rating" });
        void fetchUserSpecificData();
      }
    },
    [user, building, userStatus, fetchUserSpecificData, queryClient, toast],
  );

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      for (const file of Array.from(e.target.files)) {
        try {
          const { file: compressedFile, width, height } =
            await resizeImageWithDimensions(file);
          const previewUrl = URL.createObjectURL(compressedFile);
          setPendingImages((prev) => [
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
        } catch (_error) {
          toast({ variant: "destructive", title: "Error processing image" });
        }
      }
      e.target.value = "";
    },
    [toast],
  );

  const removePendingImage = useCallback((id: string) => {
    setPendingImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const clearPendingImages = useCallback(() => {
    setPendingImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
  }, []);

  const handleAddLink = useCallback(() => {
    if (!newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
      new URL(url);
    } catch {
      toast({ variant: "destructive", title: "Invalid URL" });
      return;
    }
    setUserLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), url, title: newLinkTitle },
    ]);
    setNewLinkUrl("");
    setNewLinkTitle("");
  }, [newLinkUrl, newLinkTitle, toast]);

  const handleRemoveLink = useCallback(
    (id: string) => setUserLinks((prev) => prev.filter((l) => l.id !== id)),
    [],
  );

  const handleSaveNote = useCallback(async () => {
    if (!user || !building) return;
    setIsSavingNote(true);
    const statusToUse = userStatus || "visited";
    if (!userStatus) setUserStatus("visited");
    try {
      // 1. Ensure user_buildings row exists with current status/rating
      const { error: ubError } = await supabase
        .from("user_buildings")
        .upsert(
          {
            user_id: user.id,
            building_id: building.id,
            status: statusToUse,
            rating: myRating > 0 ? myRating : null,
          },
          { onConflict: "user_id, building_id" },
        );
      if (ubError) throw ubError;

      // 2. Upsert the building_posts row (update existing or create new)
      let postId = activePostId;
      if (postId) {
        const { error: updateError } = await supabase
          .from("building_posts")
          .update({ body: note, updated_at: new Date().toISOString() })
          .eq("id", postId);
        if (updateError) throw updateError;
      } else {
        const { data: newPost, error: insertError } = await supabase
          .from("building_posts")
          .insert({
            user_id: user.id,
            building_id: building.id,
            body: note,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        postId = newPost.id;
        setActivePostId(postId);
      }

      // 3. Sync collection membership
      const addedIds = selectedCollectionIds.filter(
        (id) => !initialCollectionIds.includes(id),
      );
      const removedIds = initialCollectionIds.filter(
        (id) => !selectedCollectionIds.includes(id),
      );
      if (addedIds.length > 0)
        await supabase
          .from("collection_items")
          .insert(
            addedIds.map((cId) => ({
              collection_id: cId,
              building_id: building.id,
            })),
          );
      if (removedIds.length > 0)
        await supabase
          .from("collection_items")
          .delete()
          .in("collection_id", removedIds)
          .eq("building_id", building.id);
      setInitialCollectionIds(selectedCollectionIds);

      // 4. Sync review links (keyed to building_posts.id)
      await supabase.from("review_links").delete().eq("review_id", postId);
      if (userLinks.length > 0) {
        await supabase.from("review_links").insert(
          userLinks.map((l) => ({
            review_id: postId,
            user_id: user.id,
            url: l.url,
            title: l.title,
          })),
        );
      }

      // 5. Upload pending images (keyed to building_posts.id).
      // We use `.select().single()` so PostgREST returns the inserted row;
      // without it (`Prefer: return=minimal`) a silent RLS rejection can come
      // back as 201 with an empty body and we'd never know the row wasn't
      // actually written.
      if (pendingImages.length > 0) {
        for (const img of pendingImages) {
          const storagePath = await uploadFile(img.file, postId);
          const { data: inserted, error: imgInsertError } = await supabase
            .from("review_images")
            .insert({
              review_id: postId,
              user_id: user.id,
              storage_path: storagePath,
              is_generated: img.is_generated,
              width_px: img.width_px,
              height_px: img.height_px,
            })
            .select("id")
            .single();
          if (imgInsertError) throw imgInsertError;
          if (!inserted?.id) {
            throw new Error(
              `Photo insert returned no row — likely RLS/policy rejection. Storage path: ${storagePath}`,
            );
          }
        }
        pendingImages.forEach((img) => URL.revokeObjectURL(img.preview));
        setPendingImages([]);
      }

      // Keep userPosts in sync locally (avoids full refetch)
      const now = new Date().toISOString();
      setUserPosts((prev) => {
        if (activePostId) {
          return prev.map((p) =>
            p.id === activePostId ? { ...p, body: note, updated_at: now } : p,
          );
        }
        // Newly inserted post — images will be populated on next full fetch
        return [
          { id: postId, title: null, body: note, created_at: now, updated_at: now, images: [] },
          ...prev,
        ];
      });

      toast({ title: "Note saved" });
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters-v3"] });
      void fetchUserSpecificData();
    } catch (error: unknown) {
      console.error("handleSaveNote failed", error);
      toast({
        variant: "destructive",
        title: "Failed to save note",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSavingNote(false);
    }
  }, [
    user,
    building,
    userStatus,
    myRating,
    note,
    activePostId,
    selectedCollectionIds,
    initialCollectionIds,
    userLinks,
    pendingImages,
    fetchUserSpecificData,
    queryClient,
    toast,
  ]);

  const handleDelete = useCallback(async () => {
    if (!user || !building) return;
    try {
      // Delete all building_posts for this user+building (cascades to review_images, review_links, likes, comments)
      await supabase
        .from("building_posts")
        .delete()
        .eq("user_id", user.id)
        .eq("building_id", building.id);

      const { error } = await supabase
        .from("user_buildings")
        .delete()
        .eq("user_id", user.id)
        .eq("building_id", building.id);
      if (error) throw error;

      if (initialCollectionIds.length > 0) {
        await supabase
          .from("collection_items")
          .delete()
          .in("collection_id", initialCollectionIds)
          .eq("building_id", building.id);
      }
      setUserStatus(null);
      setMyRating(0);
      setNote("");
      setActivePostId(null);
      setUserPosts([]);
      setNoteEditorOpen(false);
      setSelectedCollectionIds([]);
      setInitialCollectionIds([]);
      setPendingImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.preview));
        return [];
      });
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters-v3"] });
      toast({ title: "Removed from list" });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to remove" });
    }
  }, [user, building, initialCollectionIds, queryClient, toast]);

  /** Load an existing post into the editor. Fetches its links from DB. */
  const handleSelectPost = useCallback(
    async (postId: string) => {
      const post = userPosts.find((p) => p.id === postId);
      if (!post) return;
      setActivePostId(postId);
      setNote(post.body ?? "");
      setPendingImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.preview));
        return [];
      });
      setNoteEditorOpen(true);
      // Load links for this post
      const { data: linksData } = await supabase
        .from("review_links")
        .select("id, url, title")
        .eq("review_id", postId);
      setUserLinks(
        (linksData ?? []).map((l) => ({ id: l.id, url: l.url, title: l.title ?? "" })),
      );
    },
    [userPosts],
  );

  /** Start a brand-new note (clears editor without touching existing posts). */
  const handleNewNote = useCallback(() => {
    setActivePostId(null);
    setNote("");
    setUserLinks([]);
    setPendingImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
    setNoteEditorOpen(true);
  }, []);

  const handleSendInvites = useCallback(async () => {
    if (!user || !building || selectedFriends.length === 0) return;
    setSendingInvites(true);
    try {
      const { error } = await supabase.from("recommendations").insert(
        selectedFriends.map((recipientId) => ({
          recommender_id: user.id,
          recipient_id: recipientId,
          building_id: building.id,
          status: "visit_with",
        })),
      );
      if (error) throw error;
      toast({
        title: "Invites sent!",
        description: `Sent to ${selectedFriends.length} friend${
          selectedFriends.length > 1 ? "s" : ""
        }.`,
      });
      setSelectedFriends([]);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send invites.",
      });
    } finally {
      setSendingInvites(false);
    }
  }, [user, building, selectedFriends, toast]);

  const handleSetHeroImage = useCallback(async () => {
    if (!selectedImage || !building) return;
    const newHeroId = selectedImage.id;
    const newHeroUrl = selectedImage.url;
    setHeroImageUrl(newHeroUrl);
    setBuilding((prev) =>
      prev ? { ...prev, hero_image_id: newHeroId } : null,
    );
    try {
      const { error } = await supabase
        .from("buildings")
        .update({ hero_image_id: newHeroId })
        .eq("id", building.id);
      if (error) throw error;
      toast({ title: "Hero image updated" });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to set hero image" });
    }
  }, [selectedImage, building, toast]);

  const handleToggleOfficial = useCallback(async () => {
    if (!selectedImage) return;
    const newStatus = !selectedImage.is_official;
    setSelectedImage((prev) =>
      prev ? { ...prev, is_official: newStatus } : null,
    );
    setDisplayImages((prev) =>
      prev.map((img) =>
        img.id === selectedImage.id ? { ...img, is_official: newStatus } : img,
      ),
    );
    try {
      const { error } = await supabase
        .from("review_images")
        .update({ is_official: newStatus })
        .eq("id", selectedImage.id);
      if (error) throw error;
      toast({
        title: newStatus
          ? "Added to Official Lookbook"
          : "Removed from Official Lookbook",
      });
    } catch (_error) {
      toast({
        variant: "destructive",
        title: "Failed to update lookbook status",
      });
      // Roll back optimistic update
      setSelectedImage((prev) =>
        prev ? { ...prev, is_official: !newStatus } : null,
      );
      setDisplayImages((prev) =>
        prev.map((img) =>
          img.id === selectedImage.id
            ? { ...img, is_official: !newStatus }
            : img,
        ),
      );
    }
  }, [selectedImage, toast]);

  const handleLinkLike = useCallback(
    async (linkId: string) => {
      if (!user) {
        toast({ title: "Please sign in to like links" });
        return;
      }
      const isLiked = likedLinkIds.has(linkId);
      // Optimistic update
      const newLiked = new Set(likedLinkIds);
      if (isLiked) newLiked.delete(linkId);
      else newLiked.add(linkId);
      setLikedLinkIds(newLiked);
      setTopLinks((prev) =>
        prev.map((l) =>
          l.link_id === linkId
            ? { ...l, like_count: l.like_count + (isLiked ? -1 : 1) }
            : l,
        ),
      );
      try {
        if (isLiked)
          await supabase
            .from("link_likes")
            .delete()
            .eq("link_id", linkId)
            .eq("user_id", user.id);
        else
          await supabase
            .from("link_likes")
            .insert({ link_id: linkId, user_id: user.id });
      } catch (_error) {
        toast({ variant: "destructive", title: "Failed to like link" });
        // Roll back
        setLikedLinkIds(likedLinkIds);
        setTopLinks((prev) =>
          prev.map((l) =>
            l.link_id === linkId
              ? { ...l, like_count: l.like_count + (isLiked ? 1 : -1) }
              : l,
          ),
        );
      }
    },
    [user, likedLinkIds, toast],
  );

  const canEditOfficialData = !!user;

  const isCreditsAdmin =
    profile?.role === "admin" || profile?.role === "app_admin";

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    building,
    heroImageUrl,
    loading,
    isCreator,
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
    activePostId,
    userPosts,
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
    clearPendingImages,
    handleAddLink,
    handleRemoveLink,
    handleSaveNote,
    handleSelectPost,
    handleNewNote,
    handleDelete,
    handleSendInvites,
    handleSetHeroImage,
    handleToggleOfficial,
    handleLinkLike,
    handleNextImage,
    handlePrevImage,
  };
}