/**
 * useBuildingInteractions
 *
 * Owns all data-fetching, mutation state, and event handlers for the building
 * detail page. The component keeps only:
 *   - loader / router concerns (useLoaderData, useParams)
 *   - buildingCredits query + derived auth values
 *   - pure UI toggles with no async logic (isMapExpanded)
 *   - render functions + JSX
 *
 * File location: src/features/buildings/hooks/useBuildingInteractions.ts
 */

import { useState, useEffect, useMemo, useCallback } from "react";
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

// ─── Types (local to hook, mirrored from BuildingDetails) ────────────────────

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
}

// ─── Hook return ─────────────────────────────────────────────────────────────

export interface BuildingInteractions {
  // Building state (hook owns mutations via handleSaveOfficialData / handleSetHeroImage)
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

  // Official data editing
  isOfficialEditing: boolean;
  setIsOfficialEditing: (v: boolean) => void;
  draftOfficialData: {
    name: string;
    year_completed: number;
    city: string;
    country: string;
    architect_statement: string;
  };
  setDraftOfficialData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      year_completed: number;
      city: string;
      country: string;
      architect_statement: string;
    }>
  >;
  isSavingOfficial: boolean;

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

  // Delete confirmation
  showDeleteAlert: boolean;
  setShowDeleteAlert: (v: boolean) => void;
  deleteWarningMessage: string;

  // Derived / computed
  avgRating: number | null;
  visitorCount: number;
  coordinates: { lat: number; lng: number } | null;
  googleSearchUrl: string;
  accessSynthesis: ReturnType<typeof synthesizeAccess>;
  accessBadgeVariant: () => "default" | "success" | "warning" | "brand";

  // Handlers
  handleStatusChange: (status: "visited" | "pending" | "ignored") => Promise<void>;
  handleRate: (buildingId: string, rating: number) => Promise<void>;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removePendingImage: (id: string) => void;
  handleAddLink: () => void;
  handleRemoveLink: (id: string) => void;
  handleSaveNote: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleSendInvites: () => Promise<void>;
  handleSaveOfficialData: () => Promise<void>;
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
}: UseBuildingInteractionsInput): BuildingInteractions {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Building state (mutable copy so official edits reflect immediately) ────
  const [building, setBuilding] = useState<BuildingDetails | null>(
    () => loaderBuilding ?? null,
  );
  useEffect(() => {
    if (loaderBuilding) setBuilding(loaderBuilding);
  }, [loaderBuilding]);

  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(
    initialHeroImageUrl,
  );

  // ── Core loading ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── User relationship ────────────────────────────────────────────────────
  const [isCreator, setIsCreator] = useState(false);
  const [userStatus, setUserStatus] = useState<
    "visited" | "pending" | "ignored" | null
  >(null);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // ── Official editing ─────────────────────────────────────────────────────
  const [isOfficialEditing, setIsOfficialEditing] = useState(false);
  const [draftOfficialData, setDraftOfficialData] = useState({
    name: "",
    year_completed: 0,
    city: "",
    country: "",
    architect_statement: "",
  });
  const [isSavingOfficial, setIsSavingOfficial] = useState(false);

  // Keep draft in sync when loader building changes
  useEffect(() => {
    if (building) {
      setDraftOfficialData({
        name: building.name,
        year_completed: building.year_completed,
        city: building.city || "",
        country: building.country || "",
        architect_statement: building.architect_statement || "",
      });
    }
  }, [building]);

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
  const [verifiedClaims, setVerifiedClaims] = useState<string[]>([]);
  const [hasVerifiedArchitect, setHasVerifiedArchitect] = useState(false);

  // ── Derived computeds ────────────────────────────────────────────────────
  const visitorCount = useMemo(
    () => entries.filter((e) => e.status === "visited").length,
    [entries],
  );

  const avgRating = useMemo(() => {
    const rated = entries.filter((e) => e.rating != null);
    if (rated.length === 0) return null;
    return rated.reduce((sum, e) => sum + e.rating!, 0) / rated.length;
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
        if (user && links.length > 0) {
          const linkIds = links.map((l) => l.link_id);
          const { data: likes } = await supabase
            .from("link_likes")
            .select("link_id")
            .eq("user_id", user.id)
            .in("link_id", linkIds);
          if (likes) setLikedLinkIds(new Set(likes.map((l) => l.link_id)));
        }
      }
      setLinksLoading(false);
    },
    [user],
  );

  const fetchUserSpecificData = useCallback(async () => {
    if (!building) return;
    setLoading(true);
    try {
      const resolvedBuildingId = building.id;

      if (user && building.created_by === user.id) setIsCreator(true);

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

      if (user) {
        tasks.push(
          (async () => {
            // Verified architect claims for this user
            const { data: claims } = await supabase
              .from("architect_claims")
              .select("architect_id")
              .eq("user_id", user.id)
              .eq("status", "verified");
            if (claims) setVerifiedClaims(claims.map((c) => c.architect_id));

            // User's own review entry
            const { data: userEntry } = await supabase
              .from("user_buildings")
              .select(
                "*, images:review_images(id, storage_path, is_generated, is_official)",
              )
              .eq("user_id", user.id)
              .eq("building_id", resolvedBuildingId)
              .maybeSingle();

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
                ) => item.collections?.owner_id === user.id,
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
              setNote(userEntry.content || "");
              if (myCollectionIds.length > 0) setShowCollections(true);

              const { data: userLinksData } = await supabase
                .from("review_links")
                .select("id, url, title")
                .eq("review_id", userEntry.id);
              if (userLinksData) {
                setUserLinks(
                  userLinksData.map((l) => ({
                    id: l.id,
                    url: l.url,
                    title: l.title ?? "",
                  })),
                );
              }
            }
          })(),
        );
      }

      // Community reviews + images
      tasks.push(
        (async () => {
          let followedIds = new Set<string>();
          if (user) {
            const { data: followsData } = await supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", user.id);
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
          if (user && communityImages.length > 0) {
            const imageIds = communityImages
              .filter((img) => img.type === "image")
              .map((img) => img.id);
            if (imageIds.length > 0) {
              const { data: likesData } = await supabase
                .from("image_likes")
                .select("image_id")
                .eq("user_id", user.id)
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
    } catch (_error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load building data",
      });
    } finally {
      setLoading(false);
    }
  // fetchTopLinks is stable (wrapped in useCallback). buildingCreditsFingerprint
  // is a scalar string — safe as a dep.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id, user, buildingCreditsFingerprint, fetchTopLinks]);

  useEffect(() => {
    void fetchUserSpecificData();
  }, [fetchUserSpecificData]);

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
            edited_at: new Date().toISOString(),
          },
          { onConflict: "user_id, building_id" },
        );
        if (error) throw error;
        const title =
          newStatus === "visited"
            ? "Marked as Visited"
            : newStatus === "ignored"
            ? "Building Hidden"
            : "Added to Pending";
        queryClient.invalidateQueries({
          queryKey: ["user-building-statuses"],
        });
        queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
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
            edited_at: new Date().toISOString(),
          },
          { onConflict: "user_id, building_id" },
        );
        if (error) throw error;
        queryClient.invalidateQueries({
          queryKey: ["user-building-statuses"],
        });
        queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
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
      const { data: savedEntry, error } = await supabase
        .from("user_buildings")
        .upsert(
          {
            user_id: user.id,
            building_id: building.id,
            status: statusToUse,
            rating: myRating > 0 ? myRating : null,
            content: note,
            edited_at: new Date().toISOString(),
          },
          { onConflict: "user_id, building_id" },
        )
        .select()
        .single();
      if (error) throw error;

      const reviewId = savedEntry.id;

      // Sync collection membership
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

      // Sync review links
      if (reviewId) {
        await supabase
          .from("review_links")
          .delete()
          .eq("review_id", reviewId);
        if (userLinks.length > 0) {
          await supabase.from("review_links").insert(
            userLinks.map((l) => ({
              review_id: reviewId,
              user_id: user.id,
              url: l.url,
              title: l.title,
            })),
          );
        }
      }

      // Upload pending images
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
        pendingImages.forEach((img) => URL.revokeObjectURL(img.preview));
        setPendingImages([]);
      }

      toast({ title: "Review saved" });
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
      void fetchUserSpecificData();
    } catch (_error: unknown) {
      toast({ variant: "destructive", title: "Failed to save note" });
    } finally {
      setIsSavingNote(false);
    }
  }, [
    user,
    building,
    userStatus,
    myRating,
    note,
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
      setSelectedCollectionIds([]);
      setInitialCollectionIds([]);
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
      toast({ title: "Removed from list" });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to remove" });
    }
  }, [user, building, initialCollectionIds, queryClient, toast]);

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

  const handleSaveOfficialData = useCallback(async () => {
    if (!building) return;
    setIsSavingOfficial(true);
    try {
      const { error } = await supabase
        .from("buildings")
        .update({
          name: draftOfficialData.name,
          year_completed: draftOfficialData.year_completed,
          city: draftOfficialData.city,
          country: draftOfficialData.country,
          architect_statement: draftOfficialData.architect_statement,
        })
        .eq("id", building.id);
      if (error) throw error;
      toast({ title: "Building updated successfully" });
      setIsOfficialEditing(false);
      setBuilding((prev) =>
        prev
          ? {
              ...prev,
              name: draftOfficialData.name,
              year_completed: draftOfficialData.year_completed,
              city: draftOfficialData.city || null,
              country: draftOfficialData.country || null,
              architect_statement:
                draftOfficialData.architect_statement || null,
            }
          : null,
      );
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to update building" });
    } finally {
      setIsSavingOfficial(false);
    }
  }, [building, draftOfficialData, toast]);

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
    isOfficialEditing,
    setIsOfficialEditing,
    draftOfficialData,
    setDraftOfficialData,
    isSavingOfficial,
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
    showDeleteAlert,
    setShowDeleteAlert,
    deleteWarningMessage,
    avgRating,
    visitorCount,
    coordinates,
    googleSearchUrl,
    accessSynthesis,
    accessBadgeVariant,
    handleStatusChange,
    handleRate,
    handleImageSelect,
    removePendingImage,
    handleAddLink,
    handleRemoveLink,
    handleSaveNote,
    handleDelete,
    handleSendInvites,
    handleSaveOfficialData,
    handleSetHeroImage,
    handleToggleOfficial,
    handleLinkLike,
    handleNextImage,
    handlePrevImage,
  };
}