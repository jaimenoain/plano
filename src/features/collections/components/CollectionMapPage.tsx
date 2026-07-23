import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense } from "react";
import { useParams, useNavigate, useSearchParams, Link, type MetaFunction } from "react-router";
import {
  collectionMapPageLoader,
  type CollectionMapPageLoaderData,
} from "./CollectionMapPage.loader";

export { collectionMapPageLoader as loader } from "./CollectionMapPage.loader";

export const meta: MetaFunction<typeof collectionMapPageLoader> = ({ loaderData: data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as CollectionMapPageLoaderData;
  const tags = [
    { title: d.title },
    { name: "description", content: d.description },
    { property: "og:title", content: d.title },
    { property: "og:description", content: d.description },
    { property: "og:image", content: d.ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:type", content: "website" },
    { property: "og:url", content: d.canonical },
    { property: "og:site_name", content: "Plano" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: d.title },
    { name: "twitter:description", content: d.description },
    { name: "twitter:image", content: d.ogImage },
    { tagName: "link", rel: "canonical", href: d.canonical },
  ];
  if (!d.isPublic) {
    tags.push({ name: "robots", content: "noindex, nofollow" });
  }
  return tags;
};
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MAP_MARKER_FILL } from "@/features/maps";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { parseLocation } from "@/utils/location";
import { mapCollectionItem } from "../mapCollectionItem";
import { getBoundsFromBuildings, isLngLatInBounds, type Bounds } from "@/utils/map";
import { getBuildingImageUrl } from "@/utils/image";
import { collectionStructuredData, SITE_URL } from "@/features/buildings/utils/structuredData";
import { Loader2, ExternalLink, ListFilter, MapPinPlus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SearchModeToggle } from "@/features/search/components/SearchModeToggle";
import {
  Collection,
  CollectionItemWithBuilding,
  CollectionMarker,
  Itinerary,
  type SavedPlacesDotFilter,
  type SavedPlacesStatusFilter,
} from "@/features/collections/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ItineraryList } from "@/features/collections/components/ItineraryList";
import { useItineraryStore } from "@/features/itinerary/stores/useItineraryStore";

import { DiscoveryBuilding, type StyleSummary } from "@/features/search/components/types";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { useGooglePlacePhotos } from "@/hooks/useGooglePlacePhotos";
import { primaryBuildingCreditsToSummaries } from "@/features/credits/api/credits";
import { CollectionItemRow } from "./CollectionItemRow";
import { CollectionAccessActions } from "./CollectionAccessActions";
import { useCollectionMapSelection } from "../hooks/useCollectionMapSelection";

const CollectionSettingsDialog = lazyWithRetry(() => import("@/features/collections/components/CollectionSettingsDialog").then(module => ({ default: module.CollectionSettingsDialog })));
const AddBuildingsToCollectionDialog = lazyWithRetry(() => import("@/features/collections/components/AddBuildingsToCollectionDialog").then(module => ({ default: module.AddBuildingsToCollectionDialog })));
const PlanRouteDialog = lazyWithRetry(() => import("@/features/collections/components/PlanRouteDialog").then(module => ({ default: module.PlanRouteDialog })));
const CollectionMapGL = lazyWithRetry(() => import("@/features/maps/components/CollectionMapGL").then(module => ({ default: module.CollectionMapGL })));
const CollectionMarkerCard = lazyWithRetry(() => import("@/features/collections/components/CollectionMarkerCard").then(module => ({ default: module.CollectionMarkerCard })));

const SHOW_SAVED_CANDIDATES_STORAGE = "plano:collection-map:showSavedPlaces" as const;
const SAVED_PLACES_DOT_FILTER_STORAGE = "plano:collection-map:savedPlacesDotFilter" as const;
const SAVED_PLACES_STATUS_FILTER_STORAGE = "plano:collection-map:savedPlacesStatusFilter" as const;

const SAVED_PLACES_DOT_FILTERS: SavedPlacesDotFilter[] = ['all', '1', '2', '3'];
const SAVED_PLACES_STATUS_FILTERS: SavedPlacesStatusFilter[] = ['all', 'visited', 'pending'];

function readShowSavedCandidatesFromStorage(userId: string, collectionId: string): boolean {
  try {
    return localStorage.getItem(`${SHOW_SAVED_CANDIDATES_STORAGE}:${userId}:${collectionId}`) === "true";
  } catch {
    return false;
  }
}

function writeShowSavedCandidatesToStorage(userId: string, collectionId: string, value: boolean): void {
  try {
    localStorage.setItem(`${SHOW_SAVED_CANDIDATES_STORAGE}:${userId}:${collectionId}`, String(value));
  } catch {
    /* ignore quota / private mode */
  }
}

function readSavedPlacesDotFilterFromStorage(userId: string, collectionId: string): SavedPlacesDotFilter {
  try {
    const raw = localStorage.getItem(`${SAVED_PLACES_DOT_FILTER_STORAGE}:${userId}:${collectionId}`);
    if (raw && (SAVED_PLACES_DOT_FILTERS as readonly string[]).includes(raw)) {
      return raw as SavedPlacesDotFilter;
    }
  } catch {
    /* ignore */
  }
  return 'all';
}

function writeSavedPlacesDotFilterToStorage(
  userId: string,
  collectionId: string,
  value: SavedPlacesDotFilter,
): void {
  try {
    localStorage.setItem(`${SAVED_PLACES_DOT_FILTER_STORAGE}:${userId}:${collectionId}`, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function readSavedPlacesStatusFilterFromStorage(userId: string, collectionId: string): SavedPlacesStatusFilter {
  try {
    const raw = localStorage.getItem(`${SAVED_PLACES_STATUS_FILTER_STORAGE}:${userId}:${collectionId}`);
    if (raw && (SAVED_PLACES_STATUS_FILTERS as readonly string[]).includes(raw)) {
      return raw as SavedPlacesStatusFilter;
    }
  } catch {
    /* ignore */
  }
  return 'all';
}

function writeSavedPlacesStatusFilterToStorage(
  userId: string,
  collectionId: string,
  value: SavedPlacesStatusFilter,
): void {
  try {
    localStorage.setItem(`${SAVED_PLACES_STATUS_FILTER_STORAGE}:${userId}:${collectionId}`, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function matchesSavedPlacesDotFilter(
  rating: number | null | undefined,
  filter: SavedPlacesDotFilter,
): boolean {
  if (filter === 'all') return true;
  const n = filter === '1' ? 1 : filter === '2' ? 2 : 3;
  return rating === n;
}

function matchesSavedPlacesStatusFilter(
  status: string | null | undefined,
  filter: SavedPlacesStatusFilter,
): boolean {
  if (filter === 'all') return true;
  if (status == null) return false;
  return status === filter;
}

// Note: The shape returned from Supabase for collection items is documented here
// for reference only. We no longer use this interface directly in code, but keep
// it for developments working with the underlying SQL/selects.
// type CollectionItemResponse = { ... }

/**
 * Only re-run itinerary store initialization when collection/items/markers meaningfully change.
 * TanStack Query refetches often return new array references with identical data; without this,
 * `initializeItinerary` wipes client state and feels like an unsolicited refresh.
 */
function itinerarySourceFingerprint(
  collection: Collection,
  items: CollectionItemWithBuilding[],
  markers: CollectionMarker[],
): string {
  const itemPart = [...items]
    .map(
      (i) =>
        `${i.id}:${i.note ?? ""}:${i.custom_category_id ?? ""}:${i.is_hidden ? "1" : "0"}:${i.building.location_lat}:${i.building.location_lng}:${i.building.name}`,
    )
    .sort()
    .join("|");
  const markerPart = [...markers]
    .map(
      (m) =>
        `${m.id}:${m.lat}:${m.lng}:${m.name}:${m.notes ?? ""}:${m.category}`,
    )
    .sort()
    .join("|");
  return `${collection.id}:${JSON.stringify(collection.itinerary)}:${itemPart}:${markerPart}`;
}

interface SavedCandidateResponse {
  building_id: string;
  status: string;
  rating: number | null;
  building: {
    id: string;
    name: string;
    location: unknown | null;
    city: string | null;
    country: string | null;
    slug: string | null;
    short_id: number | null;
    year_completed: number | null;
    hero_image_url: string | null;
    community_preview_url: string | null;
    location_precision: "exact" | "approximate";
    building_credits: {
      credit_tier: string | null;
      status: string | null;
      person: { id: string; name: string } | null;
      company: { id: string; name: string } | null;
    }[];
  } | null;
}

/** Returns a copy of the search params with the given keys removed (for consume-once deep links). */
function withoutSearchParams(prev: URLSearchParams, ...keys: string[]): URLSearchParams {
  const next = new URLSearchParams(prev);
  keys.forEach((key) => next.delete(key));
  return next;
}

export default function CollectionMap() {
  const { username, slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // Selection-mode detail drawer (parity with /search) — opens from pin or row.
  const { selectedCluster, setSelectedCluster, selectItem, closeDetail, clearIfBuilding } =
    useCollectionMapSelection();
  const [showSettings, setShowSettings] = useState(false);
  const [hasSettingsOpened, setHasSettingsOpened] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] =
    useState<"map" | "general" | "markers" | "collaborators">("map");
  const [showAddBuildings, setShowAddBuildings] = useState(false);
  const [hasAddBuildingsOpened, setHasAddBuildingsOpened] = useState(false);
  const [justCreatedBuildingId, setJustCreatedBuildingId] = useState<string | null>(null);
  const [showPlanRoute, setShowPlanRoute] = useState(false);
  const [hasPlanRouteOpened, setHasPlanRouteOpened] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [activeTab, setActiveTab] = useState<'items' | 'itinerary'>('items');

  const [showSavedCandidates, setShowSavedCandidates] = useState(false);
  const [savedPlacesDotFilter, setSavedPlacesDotFilter] = useState<SavedPlacesDotFilter>('all');
  const [savedPlacesStatusFilter, setSavedPlacesStatusFilter] = useState<SavedPlacesStatusFilter>('all');

  // New States for Removal
  const [itemToRemove, setItemToRemove] = useState<CollectionItemWithBuilding | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [markerToRemove, setMarkerToRemove] = useState<CollectionMarker | null>(null);
  const [showRemoveMarkerConfirm, setShowRemoveMarkerConfirm] = useState(false);

  // New States for Save All
  const [showSaveAllConfirm, setShowSaveAllConfirm] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Map Bounds State
  const [initialBounds, setInitialBounds] = useState<Bounds | null>(null);
  /** Geographic bounds of the map viewport (for “add visible saved places”). */
  const [viewportBounds, setViewportBounds] = useState<Bounds | null>(null);
  const [isAddingVisibleCandidates, setIsAddingVisibleCandidates] = useState(false);
  const [showAddVisibleConfirm, setShowAddVisibleConfirm] = useState(false);
  const [bulkAddPreviewBuildings, setBulkAddPreviewBuildings] = useState<DiscoveryBuilding[]>([]);

  const initializeItinerary = useItineraryStore((state) => state.initializeItinerary);
  const lastItineraryInitFingerprint = useRef<string | null>(null);

  useEffect(() => {
    if (showSettings) setHasSettingsOpened(true);
  }, [showSettings]);

  useEffect(() => {
    if (showAddBuildings) setHasAddBuildingsOpened(true);
  }, [showAddBuildings]);

  useEffect(() => {
    if (showPlanRoute) setHasPlanRouteOpened(true);
  }, [showPlanRoute]);


  // 1. Resolve User (Owner)
  const { data: ownerProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      if (!username) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", username)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!username
  });

  // 2. Fetch Collection
  const { data: collection, isLoading: loadingCollection } = useQuery({
    queryKey: ["collection", slug, ownerProfile?.id],
    queryFn: async () => {
      if (!ownerProfile?.id || !slug) return null;
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("owner_id", ownerProfile.id)
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data as Collection;
    },
    enabled: !!ownerProfile?.id && !!slug
  });

  useLayoutEffect(() => {
    if (!user?.id || !collection?.id) return;
    setShowSavedCandidates(readShowSavedCandidatesFromStorage(user.id, collection.id));
    setSavedPlacesDotFilter(readSavedPlacesDotFilterFromStorage(user.id, collection.id));
    setSavedPlacesStatusFilter(readSavedPlacesStatusFilterFromStorage(user.id, collection.id));
  }, [user?.id, collection?.id]);

  const handleShowSavedCandidatesChange = useCallback(
    (show: boolean) => {
      setShowSavedCandidates(show);
      if (user?.id && collection?.id) {
        writeShowSavedCandidatesToStorage(user.id, collection.id, show);
      }
    },
    [user?.id, collection?.id],
  );

  const handleSavedPlacesDotFilterChange = useCallback(
    (filter: SavedPlacesDotFilter) => {
      setSavedPlacesDotFilter(filter);
      if (user?.id && collection?.id) {
        writeSavedPlacesDotFilterToStorage(user.id, collection.id, filter);
      }
    },
    [user?.id, collection?.id],
  );

  const handleSavedPlacesStatusFilterChange = useCallback(
    (filter: SavedPlacesStatusFilter) => {
      setSavedPlacesStatusFilter(filter);
      if (user?.id && collection?.id) {
        writeSavedPlacesStatusFilterToStorage(user.id, collection.id, filter);
      }
    },
    [user?.id, collection?.id],
  );

  // The current user's contributor role on this collection (null if not a contributor).
  // Only an "editor" contributor may write — this mirrors the RLS policies exactly, so
  // the UI never offers edit controls the database will reject.
  const { data: contributorRole } = useQuery({
    queryKey: ["collection_contributor_role", collection?.id, user?.id],
    queryFn: async () => {
      if (!collection?.id || !user?.id) return null;
      const { data } = await supabase
        .from("collection_contributors")
        .select("role")
        .eq("collection_id", collection.id)
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.role ?? null;
    },
    enabled: !!collection?.id && !!user?.id
  });

  const isOwner = user?.id === collection?.owner_id;
  const isEditorContributor = contributorRole === "editor";
  // Write access = exactly what RLS permits: owner or editor contributor. Admins have no
  // RLS bypass on collections, so they are treated as ordinary viewers here (no failing UI).
  const canEdit = isOwner || isEditorContributor;

  // Consume-once deep links (owner/editor only): ?settings=collaborators opens the settings sheet on
  // the Collaborators tab; ?addBuildings=1&createdBuilding=<id> is the "Create new building" return
  // trip — reopen the Add-to-Collection modal and hand it the new building (auto-add + select).
  useEffect(() => {
    if (!canEdit) return;
    if (searchParams.get("settings") === "collaborators") {
      setSettingsInitialTab("collaborators");
      setShowSettings(true);
      setSearchParams((prev) => withoutSearchParams(prev, "settings"), { replace: true });
    }
    if (searchParams.get("addBuildings") === "1") {
      setJustCreatedBuildingId(searchParams.get("createdBuilding"));
      setShowAddBuildings(true);
      setSearchParams((prev) => withoutSearchParams(prev, "addBuildings", "createdBuilding"), {
        replace: true,
      });
    }
  }, [searchParams, canEdit, setSearchParams]);

  // 3. Fetch Items and Markers
  const { data: collectionData, isLoading: loadingItems, refetch: refetchItems } = useQuery({
    queryKey: ["collection_items", collection?.id],
    queryFn: async () => {
      if (!collection?.id) return { items: [], markers: [] };

      const itemsPromise = supabase
        .from("collection_items")
        .select(`
          id,
          building_id,
          note,
          custom_category_id,
          is_hidden,
          added_by,
          added_by_user:profiles!collection_items_added_by_fkey(id, username),
          building:buildings(
            id,
            name,
            location,
            city,
            country,
            slug,
            short_id,
            year_completed,
            hero_image_url,
            community_preview_url,
            location_precision,
            building_credits(
              credit_tier,
              status,
              person:people(id, name),
              company:companies(id, name)
            )
          )
        `)
        .eq("collection_id", collection.id);

      const markersPromise = supabase
        .from("collection_markers")
        .select("*")
        .eq("collection_id", collection.id);

      const [itemsResult, markersResult] = await Promise.all([itemsPromise, markersPromise]);

      if (itemsResult.error) throw itemsResult.error;
      if (markersResult.error) throw markersResult.error;

      // Transform + parse location for items (drops rows with deleted buildings).
      const items = itemsResult.data
        .map(mapCollectionItem)
        .filter((item): item is CollectionItemWithBuilding => item !== null);

      return {
        items,
        markers: markersResult.data as CollectionMarker[]
      };
    },
    enabled: !!collection?.id
  });

  const items: CollectionItemWithBuilding[] = collectionData?.items ?? [];
  const markers: CollectionMarker[] = collectionData?.markers ?? [];

  const { photos } = useGooglePlacePhotos(markers);

  useEffect(() => {
    if (!collection || items === undefined) return;

    const fingerprint = itinerarySourceFingerprint(collection, items, markers);
    if (lastItineraryInitFingerprint.current === fingerprint) return;
    lastItineraryInitFingerprint.current = fingerprint;

    initializeItinerary(collection.itinerary, items, markers);
  }, [collection, items, markers, initializeItinerary]);

  // Inject ItemList JSON-LD for public collections
  useEffect(() => {
    if (!collection || !collection.is_public || items.length === 0) return;
    const listUrl =
      username != null && username.length > 0
        ? `${SITE_URL}/${username}/map/${collection.slug}`
        : undefined;
    const ldData = collectionStructuredData({
      name: collection.name,
      description: collection.description,
      slug: collection.slug,
      ...(listUrl ? { listUrl } : {}),
      buildings: items.map((item) => ({
        id: item.building.id,
        name: item.building.name,
        slug: item.building.slug ?? null,
        short_id: item.building.short_id ?? null,
      })),
    });
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-collection-ld", "");
    script.textContent = JSON.stringify(ldData);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [collection, items]);

  const existingBuildingIds = useMemo<Set<string>>(() => {
    return new Set<string>(items.map((item) => item.building.id));
  }, [items]);

  const hiddenBuildingIds = useMemo<Set<string>>(() => {
    return new Set<string>(
      items.filter((item) => item.is_hidden).map((item) => item.building.id),
    );
  }, [items]);

  // 3b. Fetch Saved Buildings (Candidates)
  const { data: savedCandidates } = useQuery({
    queryKey: ["saved_candidates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Fetch user buildings that are visited or pending
      const { data, error } = await supabase
        .from("user_buildings")
        .select(`
          building_id,
          status,
          rating,
          building:buildings(
            id,
            name,
            location,
            city,
            country,
            slug,
            short_id,
            year_completed,
            hero_image_url,
            community_preview_url,
            location_precision,
            building_credits(
              credit_tier,
              status,
              person:people(id, name),
              company:companies(id, name)
            )
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["visited", "pending"]);

      if (error) throw error;

      // Filter out items already in collection and transform
      return (data as SavedCandidateResponse[])
        .filter((row) => row.building)
        .map((row) => {
            const b = row.building!;
            const location = parseLocation(b.location);
            return {
                id: b.id,
                name: b.name,
                main_image_url: b.hero_image_url || b.community_preview_url,
                location_lat: location?.lat || 0,
                location_lng: location?.lng || 0,
                city: b.city,
                country: b.country,
                slug: b.slug,
                short_id: b.short_id,
                year_completed: b.year_completed,
                location_precision: b.location_precision,
                credits: primaryBuildingCreditsToSummaries(b.building_credits ?? []),
                styles: [],
                color: null, // Let BuildingDiscoveryMap use status color
                personal_rating: row.rating ?? null,
                personal_status: row.status ?? null,
            } as DiscoveryBuilding;
        })
        .filter(b => b.location_lat !== 0 && b.location_lng !== 0);
    },
    enabled: !!user?.id && showSavedCandidates
  });

  // 4. Fetch Contributors (Only if needed for status/rating)
  const shouldFetchStats = collection && ['status', 'rating_member'].includes(collection.categorization_method);

  const { data: memberIds } = useQuery({
    queryKey: ["collection_members", collection?.id],
    queryFn: async () => {
      if (!collection) return [];
      // Owner
      const members = [collection.owner_id];
      // Contributors
      const { data } = await supabase
        .from("collection_contributors")
        .select("user_id")
        .eq("collection_id", collection.id);

      if (data) {
        members.push(...data.map(d => d.user_id));
      }
      return members;
    },
    enabled: !!collection && !!shouldFetchStats
  });

  // 5. Fetch User Buildings for Stats
  const { data: statsData } = useQuery({
    queryKey: ["collection_stats", collection?.id, collection?.categorization_method, collection?.categorization_selected_members, memberIds],
    queryFn: async () => {
       if (!items || items.length === 0 || !memberIds || !collection?.id) return [];

       // Use RPC to fetch stats securely, bypassing direct RLS on user_buildings
       // This ensures visitors can see the categorization status (visited/rated)
       // even if they can't access the raw user_buildings records.
       const { data, error } = await supabase
          .rpc('get_collection_stats', { collection_uuid: collection.id });

       if (error) throw error;
       return data;
    },
    enabled: !!items && items.length > 0 && !!memberIds && !!shouldFetchStats && !!collection?.id
  });

  // 6. Check Favorite Status
  const { data: isFavorite, refetch: refetchFavorite } = useQuery({
    queryKey: ["collection_favorite", collection?.id, user?.id],
    queryFn: async () => {
      if (!collection?.id || !user?.id) return false;
      const { data } = await supabase
        .from("collection_favorites")
        .select("id")
        .eq("collection_id", collection.id)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!collection?.id && !!user?.id && !canEdit
  });

  const handleToggleFavorite = async () => {
    if (!user || !collection) return;

    if (isFavorite) {
       const { error } = await supabase.from("collection_favorites").delete().eq("collection_id", collection.id).eq("user_id", user.id);
       if (!error) toast({ title: "Removed from favorites" });
    } else {
       const { error } = await supabase.from("collection_favorites").insert({ collection_id: collection.id, user_id: user.id });
       if (!error) toast({ title: "Added to favorites" });
    }
    refetchFavorite();
  };

  const isLoading = loadingProfile || loadingCollection || loadingItems;

  // 3c. Fetch User Interactions (Personal Status)
  const { data: userInteractions } = useQuery({
    queryKey: ["user_interactions", user?.id, collection?.id, items?.length],
    queryFn: async () => {
      if (!user?.id || !items || items.length === 0) return [];
      const buildingIds = items.map(i => i.building.id);

      const { data, error } = await supabase
        .from("user_buildings")
        .select("building_id, rating, status")
        .eq("user_id", user.id)
        .in("building_id", buildingIds);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!items && items.length > 0
  });

  // Create a map for quick lookup
  const userInteractionMap = useMemo(() => {
    const map = new Map<string, { rating: number | null; status: string | null }>();
    userInteractions?.forEach((i) => {
      map.set(i.building_id, { rating: i.rating, status: i.status });
    });
    return map;
  }, [userInteractions]);

  // Prepare map buildings
  const mapBuildings = useMemo<DiscoveryBuilding[]>(() => {
    const buildingNodes: DiscoveryBuilding[] = [];

    // 1. Process Buildings
    if (items) {
        // Filter out hidden items for display
        const visibleItems = items.filter(item => !item.is_hidden);

        // Pre-calculate stats map
        const statsMap = new Map<string, { visitedCount: number, maxRating: number, hasSaved: boolean }>();

        if (statsData) {
            // Group by building
            const statRows = statsData as unknown as {
              building_id: string;
              status: string | null;
              rating: number | null;
            }[];
            statRows.forEach((row) => {
                if (!statsMap.has(row.building_id)) {
                    statsMap.set(row.building_id, { visitedCount: 0, maxRating: 0, hasSaved: false });
                }
                const stat = statsMap.get(row.building_id)!;
                if (row.status === 'visited') stat.visitedCount++;
                if (row.rating && row.rating > stat.maxRating) stat.maxRating = row.rating;
                stat.hasSaved = true; // Present in user_buildings implies saved/interested
            });
        }

        const mappedBuildings: DiscoveryBuilding[] = visibleItems.map((item) => {
        let color: string | null = null;
        const interaction = userInteractionMap.get(item.building.id);

        // Markers are monochrome. Categorisation is carried by a light-to-dark value
        // ladder (black → white → muted), never by hue: gold/silver/bronze and
        // green/orange both broke the design system's "markers are currentColor" rule.
        if (collection?.categorization_method === 'custom') {
            // A member-chosen category colour cannot survive a monochrome map, so every
            // custom category now renders identically. The colour picker in
            // CollectionSettingsDialog is consequently inert — see docs/Roadmap.md PR 7.
            color = MAP_MARKER_FILL.brandPrimary;
        } else if (collection?.categorization_method === 'uniform') {
            color = MAP_MARKER_FILL.brandPrimary;
        } else if (shouldFetchStats && statsData && memberIds) {
            const stat = statsMap.get(item.building.id);
            const targetUserIds = collection?.categorization_selected_members && collection.categorization_selected_members.length > 0
                ? collection.categorization_selected_members
                : memberIds;
            const targetCount = targetUserIds.length;

            if (collection.categorization_method === 'status') {
                if (!stat || stat.visitedCount === 0) {
                    color = MAP_MARKER_FILL.surfaceMuted80; // Not visited
                } else if (stat.visitedCount >= targetCount && targetCount > 0) {
                    color = MAP_MARKER_FILL.brandPrimary; // Visited by all
                } else {
                    color = MAP_MARKER_FILL.white; // Visited by some
                }
            } else if (collection.categorization_method === 'rating_member') {
                if (!stat || !stat.hasSaved) {
                    color = MAP_MARKER_FILL.surfaceMuted80; // No rating on record
                } else if (stat.maxRating === 3) color = MAP_MARKER_FILL.brandPrimary;
                else if (stat.maxRating === 2) color = MAP_MARKER_FILL.white;
                else if (stat.maxRating === 1) color = MAP_MARKER_FILL.surfaceMuted;
                else color = MAP_MARKER_FILL.surfaceMuted80; // Saved, unrated
            }
        }

        return {
            id: item.building.id,
            name: item.building.name,
            main_image_url: item.building.hero_image_url || item.building.community_preview_url,
            location_lat: item.building.location_lat,
            location_lng: item.building.location_lng,
            city: item.building.city,
            country: item.building.country,
            slug: item.building.slug,
            short_id: item.building.short_id,
            year_completed: item.building.year_completed,
            location_precision: item.building.location_precision,
            credits: primaryBuildingCreditsToSummaries(item.building.building_credits ?? []),
            styles: null as StyleSummary[] | null,
            color: color,
            personal_rating: interaction?.rating || null,
            personal_status: interaction?.status || null,
        };
        });
        buildingNodes.push(...mappedBuildings);
    }

    // 2. Process Markers
    if (markers) {
        const mappedMarkers = markers.map(marker => ({
            id: marker.id,
            name: marker.name,
            location_lat: marker.lat,
            location_lng: marker.lng,
            city: null,
            country: null,
            credits: [],
            styles: [] as StyleSummary[],
            year_completed: null,
            isMarker: true,
            markerCategory: marker.category,
            markerGooglePrimaryType: marker.google_primary_type ?? null,
            notes: marker.notes,
            address: marker.address,
            google_place_id: marker.google_place_id,
            website: marker.website,
            // Standalone (non-building) markers sit at the quietest step of the ladder
            color: MAP_MARKER_FILL.surfaceMuted80,
            main_image_url: photos[marker.id]?.url || null,
            image_attribution: photos[marker.id]?.attribution || null
        } as DiscoveryBuilding));
        buildingNodes.push(...mappedMarkers);
    }

    return buildingNodes;
  }, [items, markers, collection, statsData, memberIds, shouldFetchStats, userInteractionMap, photos]);

  const coverMosaicUrls = useMemo(() => {
    if (!items) return [];
    return items
      .filter((item) => !item.is_hidden)
      .map((item) => item.building.hero_image_url || item.building.community_preview_url)
      .filter((url): url is string => Boolean(url))
      .slice(0, 4);
  }, [items]);

  const allMapBuildings = useMemo(() => {
    if (showSavedCandidates && savedCandidates) {
      const filteredCandidates = savedCandidates.filter(
        (c) =>
          !existingBuildingIds.has(c.id) &&
          matchesSavedPlacesDotFilter(c.personal_rating ?? null, savedPlacesDotFilter) &&
          matchesSavedPlacesStatusFilter(c.personal_status ?? null, savedPlacesStatusFilter),
      );
      const dimmedExisting = mapBuildings.map(b => ({ ...b, isDimmed: true }));
      return [...dimmedExisting, ...filteredCandidates.map(c => ({ ...c, isCandidate: true }))];
    }
    return mapBuildings;
  }, [
    mapBuildings,
    savedCandidates,
    showSavedCandidates,
    existingBuildingIds,
    savedPlacesDotFilter,
    savedPlacesStatusFilter,
  ]);

  // Calculate bounds only once when buildings are loaded to prevent map movement on updates
  useEffect(() => {
    if (!initialBounds && mapBuildings.length > 0) {
      setInitialBounds(getBoundsFromBuildings(mapBuildings));
    }
  }, [mapBuildings, initialBounds]);

  // Reset bounds when switching collections
  useEffect(() => {
    setInitialBounds(null);
    setViewportBounds(null);
  }, [slug]);

  const visibleSavedCandidatesToAdd = useMemo(() => {
    if (!showSavedCandidates || !savedCandidates?.length || !viewportBounds) return [];
    return savedCandidates.filter(
      (c) =>
        !existingBuildingIds.has(c.id) &&
        matchesSavedPlacesDotFilter(c.personal_rating ?? null, savedPlacesDotFilter) &&
        matchesSavedPlacesStatusFilter(c.personal_status ?? null, savedPlacesStatusFilter) &&
        isLngLatInBounds(c.location_lat, c.location_lng, viewportBounds),
    );
  }, [
    showSavedCandidates,
    savedCandidates,
    viewportBounds,
    existingBuildingIds,
    savedPlacesDotFilter,
    savedPlacesStatusFilter,
  ]);

  const handleUpdateNote = async (itemId: string, newNote: string) => {
      const { error } = await supabase
          .from("collection_items")
          .update({ note: newNote })
          .eq("id", itemId);

      if (!error) {
          refetchItems();
      }
  };

  const handleUpdateCategory = async (itemId: string, categoryId: string) => {
    const { error } = await supabase
        .from("collection_items")
        .update({ custom_category_id: categoryId || null })
        .eq("id", itemId);

    if (!error) {
        refetchItems();
    }
  };

  const handleUpdateMarkerNote = async (markerId: string, newNote: string) => {
      const { error } = await supabase
          .from("collection_markers")
          .update({ notes: newNote })
          .eq("id", markerId);

      if (!error) {
          refetchItems();
      } else {
        toast({
            title: "Error",
            description: "Failed to update note.",
            variant: "destructive"
        });
      }
  };

  const handleAddToCollection = async (building: DiscoveryBuilding) => {
    if (!collection?.id) return;

    const { error } = await supabase
        .from("collection_items")
        .insert({
            collection_id: collection.id,
            building_id: building.id
        });

    if (error) {
        toast({
            title: "Error",
            description: "Failed to add building to collection.",
            variant: "destructive"
        });
    } else {
        toast({
            title: "Added",
            description: `${building.name} added to collection.`
        });
        refetchItems();
        // Invalidate saved candidates to refresh the list (it should disappear from candidates)
        queryClient.invalidateQueries({ queryKey: ["saved_candidates"] });
    }
  };

  const handleOpenAddVisibleConfirm = useCallback(() => {
    if (visibleSavedCandidatesToAdd.length === 0) return;
    setBulkAddPreviewBuildings([...visibleSavedCandidatesToAdd]);
    setShowAddVisibleConfirm(true);
  }, [visibleSavedCandidatesToAdd]);

  const handleConfirmAddVisibleSavedCandidates = async () => {
    if (!collection?.id || bulkAddPreviewBuildings.length === 0) return;

    setIsAddingVisibleCandidates(true);
    try {
      const rows = bulkAddPreviewBuildings.map((b) => ({
        collection_id: collection.id,
        building_id: b.id,
      }));
      const { error } = await supabase.from("collection_items").insert(rows);

      if (error) throw error;

      const n = bulkAddPreviewBuildings.length;
      toast({
        title: "Added to collection",
        description:
          n === 1
            ? `${bulkAddPreviewBuildings[0].name} was added.`
            : `${n} saved places in view were added.`,
      });
      refetchItems();
      queryClient.invalidateQueries({ queryKey: ["saved_candidates"] });
      setShowAddVisibleConfirm(false);
      setBulkAddPreviewBuildings([]);
    } catch {
      toast({
        title: "Error",
        description: "Could not add buildings to the collection.",
        variant: "destructive",
      });
    } finally {
      setIsAddingVisibleCandidates(false);
    }
  };


  const handleUpdateItinerary = async (newItinerary: Itinerary) => {
      if (!collection?.id) return;

      const { error } = await supabase
          .from("collections")
          .update({ itinerary: newItinerary as unknown as Json })
          .eq("id", collection.id);

      if (error) {
          toast({
              title: "Error",
              description: "Failed to save itinerary changes.",
              variant: "destructive"
          });
      } else {
          // No toast for quiet saves
          // We don't refetch the whole collection to avoid resetting the store unexpectedly,
          // but we might want to invalidate queries eventually.
          queryClient.invalidateQueries({ queryKey: ["collection", slug, ownerProfile?.id] });
      }
  };

  const handleRemoveItem = (buildingId: string) => {
    const item = items?.find(i => i.building.id === buildingId);
    if (item) {
      setItemToRemove(item);
      setShowRemoveConfirm(true);
      return;
    }
    const marker = markers?.find(m => m.id === buildingId);
    if (marker) {
        setMarkerToRemove(marker);
        setShowRemoveMarkerConfirm(true);
    }
  };

  const handleConfirmRemove = async () => {
    if (!itemToRemove) return;

    const { error } = await supabase
      .from("collection_items")
      .delete()
      .eq("id", itemToRemove.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove building from collection.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Removed",
        description: `${itemToRemove.building.name} removed from collection.`
      });
      refetchItems();
      // Invalidate saved candidates so it reappears as a candidate if applicable
      queryClient.invalidateQueries({ queryKey: ["saved_candidates"] });
      // Close the detail drawer if it was showing the just-removed building.
      clearIfBuilding(itemToRemove.building.id);
    }
    setShowRemoveConfirm(false);
    setItemToRemove(null);
  };

  const handleConfirmRemoveMarker = async () => {
    if (!markerToRemove) return;

    const { error } = await supabase
      .from("collection_markers")
      .delete()
      .eq("id", markerToRemove.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove marker.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Removed",
        description: `${markerToRemove.name} removed from map.`
      });
      refetchItems();
    }
    setShowRemoveMarkerConfirm(false);
    setMarkerToRemove(null);
  };

  const handleSaveAllBuildings = async () => {
    if (!user?.id) {
        navigate("/login");
        return;
    }

    if (!items) return;

    setIsSavingAll(true);
    try {
        // 1. Get all existing interactions for the current user
        const { data: existingUserBuildings, error: fetchError } = await supabase
            .from('user_buildings')
            .select('building_id')
            .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        const existingIds = new Set(existingUserBuildings?.map(row => row.building_id) || []);

        // 2. Identify new buildings to save (exclude hidden ones in the collection)
        const buildingsToSave = items
            .filter(item => !item.is_hidden)
            .map(item => item.building.id)
            .filter(id => !existingIds.has(id));

        if (buildingsToSave.length === 0) {
             toast({
                 title: "No new buildings",
                 description: "You have already saved, visited, or hidden all buildings in this collection."
             });
             return;
        }

        // 3. Bulk Insert
        const { error: insertError } = await supabase
            .from('user_buildings')
            .insert(
                buildingsToSave.map(id => ({
                    user_id: user.id,
                    building_id: id,
                    status: 'pending'
                }))
            );

        if (insertError) throw insertError;

        toast({
            title: "Saved!",
            description: `Successfully saved ${buildingsToSave.length} buildings to your profile.`
        });

        queryClient.invalidateQueries({ queryKey: ["saved_candidates"] });

    } catch (_error) {
toast({
            title: "Error",
            description: "Failed to save buildings.",
            variant: "destructive"
        });
    } finally {
        setIsSavingAll(false);
        setShowSaveAllConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Collection" showBack>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
        </div>
      </AppLayout>
    );
  }

  if (!collection) {
    return (
      <AppLayout title="Not Found" showBack>
        <div className="flex items-center justify-center h-[calc(100vh-64px)] text-text-secondary">
          Collection not found
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={collection.name} showBack isFullScreen>
      <div className="relative flex h-[calc(100dvh-9rem-env(safe-area-inset-bottom))] min-h-0 flex-1 flex-col overflow-hidden lg:flex-row-reverse md:fixed md:inset-x-0 md:bottom-0 md:left-0 md:right-0 md:top-16 md:h-auto">
        <div className="lg:hidden">
          <SearchModeToggle
            mode={viewMode}
            onModeChange={setViewMode}
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50"
          />
        </div>

        {/* Sidebar List */}
        <div className={cn(
          "w-full shrink-0 flex-col border-t border-border-default bg-surface-card lg:flex lg:h-full lg:w-collection-rail-narrow lg:min-h-0 lg:border-l lg:border-t-0 xl:w-collection-rail",
          viewMode === 'list' ? "order-2 flex h-full lg:order-2" : "hidden lg:flex lg:order-2",
        )}
        >
            <div className="border-b">
                {coverMosaicUrls.length >= 4 && (
                  <div className="grid grid-cols-4 gap-mosaic-gap bg-border-default">
                    {coverMosaicUrls.map((url, index) => (
                      <div key={index} className="aspect-4/5 overflow-hidden bg-surface-muted">
                        <img
                          src={getBuildingImageUrl(url) ?? url}
                          alt=""
                          className="h-full w-full rounded-none object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-2xl font-bold leading-tight tracking-tight">{collection.name}</h1>
                    <div className="text-sm text-text-secondary mb-1">
                      By: <Link to={`/profile/${ownerProfile?.username}`} className="hover:underline text-text-primary">{ownerProfile?.username}</Link>
                    </div>
                    {collection.description && <p className="text-sm text-text-secondary line-clamp-2">{collection.description}</p>}
                    {collection.external_link && (
                        <Button variant="outline" size="sm" className="mt-2 h-8" asChild>
                            <a href={collection.external_link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-2" />
                                Visit Link
                            </a>
                        </Button>
                    )}
                </div>
                {collection && (
                    <CollectionAccessActions
                        canEdit={canEdit}
                        isLoggedIn={!!user}
                        collectionId={collection.id}
                        isFavorite={!!isFavorite}
                        onToggleFavorite={handleToggleFavorite}
                        onAdd={() => setShowAddBuildings(true)}
                        onOpenSettings={() => setShowSettings(true)}
                    />
                )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col justify-start">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'items' | 'itinerary')} className="w-full h-full flex-1 flex flex-col min-h-0 justify-start">
                    {collection.itinerary && (
                        <div className="px-4 pt-2 shrink-0">
                            <TabsList className="w-full grid grid-cols-2">
                                <TabsTrigger value="items">All Items</TabsTrigger>
                                <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                            </TabsList>
                        </div>
                    )}

                    <TabsContent value="items" className="mt-0 flex-1 overflow-hidden m-0 p-0 min-h-0 flex flex-col justify-start data-[state=inactive]:hidden">
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 space-y-3 pb-24 lg:pb-4">
                                {items && items.filter(i => !i.is_hidden).map(item => (
                                    <CollectionItemRow
                                        key={item.id}
                                        item={item}
                                        isHighlighted={highlightedId === item.building.id}
                                        setHighlightedId={setHighlightedId}
                                        canEdit={canEdit}
                                        onUpdateNote={(note) => handleUpdateNote(item.id, note)}
                                        onSelect={() => selectItem(item)}
                                        categorizationMethod={collection.categorization_method}
                                        customCategories={collection.custom_categories}
                                        onUpdateCategory={(catId) => handleUpdateCategory(item.id, catId)}
                                        showImages={collection.show_community_images ?? true}
                                        showAddedBy={collection.show_added_by ?? false}
                                        onRemove={() => handleRemoveItem(item.building.id)}
                                    />
                                ))}

                                {markers && markers.length > 0 && (
                                    <div className="mt-4 border-t pt-2">
                                        <Accordion type="single" collapsible defaultValue="markers">
                                            <AccordionItem value="markers" className="border-none">
                                                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold text-text-secondary">
                                                    Trip Logistics
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="space-y-3 pt-2">
                                                        <Suspense fallback={<div className="p-2 text-center text-xs text-text-secondary">Loading markers...</div>}>
                                                            {markers.map(marker => (
                                                                <CollectionMarkerCard
                                                                    key={marker.id}
                                                                    marker={marker}
                                                                    isHighlighted={highlightedId === marker.id}
                                                                    setHighlightedId={setHighlightedId}
                                                                    canEdit={canEdit}
                                                                    onRemove={() => handleRemoveItem(marker.id)}
                                                                    onNavigate={() => {
                                                                        // Just highlight
                                                                        setHighlightedId(marker.id);
                                                                    }}
                                                                    onUpdateNote={
                                                                      canEdit
                                                                        ? (note) => {
                                                                            void handleUpdateMarkerNote(marker.id, note);
                                                                          }
                                                                        : undefined
                                                                    }
                                                                />
                                                            ))}
                                                        </Suspense>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </div>
                                )}

                                {(!items || items.filter(i => !i.is_hidden).length === 0) && (!markers || markers.length === 0) && (
                                    <div className="text-center py-8 text-text-secondary text-sm">
                                        No places in this collection yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="itinerary" className="mt-0 flex-1 overflow-hidden m-0 p-0 min-h-0 flex flex-col justify-start data-[state=inactive]:hidden">
                         <div className="flex-1 overflow-y-auto">
                            <div className="p-4 pb-24 lg:pb-4">
                                <ItineraryList
                                    highlightedId={highlightedId}
                                    setHighlightedId={setHighlightedId}
                                    onUpdateItinerary={canEdit ? handleUpdateItinerary : undefined}
                                    canEdit={canEdit}
                                    onUpdateNote={handleUpdateNote}
                                    onUpdateMarkerNote={canEdit ? handleUpdateMarkerNote : undefined}
                                    markerPlacePhotos={photos}
                                />
                                {!collection.itinerary && (
                                    <div className="text-center py-8 text-text-secondary">
                                        <p>No itinerary generated yet.</p>
                                        {canEdit && (
                                            <Button
                                                variant="outline"
                                                className="mt-4"
                                                onClick={() => setShowPlanRoute(true)}
                                            >
                                                Generate Itinerary
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                         </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>

        {/* Map */}
        <div className={cn(
          "relative flex-1 lg:flex lg:h-full lg:min-h-0",
          viewMode === 'map' ? "order-1 flex h-full lg:order-1" : "hidden lg:flex lg:order-1",
        )}
        >
            <Suspense fallback={
                <div className="flex items-center justify-center h-full w-full bg-surface-muted/20">
                    <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
                </div>
            }>
                <CollectionMapGL
                    buildings={allMapBuildings}
                    highlightedId={highlightedId}
                    setHighlightedId={setHighlightedId}
                    selectedCluster={selectedCluster}
                    onSelectBuilding={setSelectedCluster}
                    onCloseDetail={closeDetail}
                    onRemoveFromCollection={canEdit ? handleRemoveItem : undefined}
                    onAddCandidate={handleAddToCollection}
                    onRemoveItem={canEdit ? handleRemoveItem : undefined}
                    onUpdateMarkerNote={canEdit ? handleUpdateMarkerNote : undefined}
                    onRemoveMarker={canEdit ? handleRemoveItem : undefined}
                    showSavedCandidates={showSavedCandidates}
                    showItinerary={activeTab === 'itinerary'}
                    onViewportBoundsChange={setViewportBounds}
                    bottomLeftOverlay={
                      showSavedCandidates && canEdit ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="w-full shadow-none border border-border-default bg-surface-card/95 backdrop-blur-xs"
                          disabled={
                            visibleSavedCandidatesToAdd.length === 0 ||
                            !viewportBounds ||
                            isAddingVisibleCandidates
                          }
                          onClick={handleOpenAddVisibleConfirm}
                        >
                          {isAddingVisibleCandidates ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />
                              Adding…
                            </>
                          ) : (
                            <>
                              <MapPinPlus className="h-4 w-4 mr-2 shrink-0" />
                              <span className="truncate">
                                Add in view
                                {visibleSavedCandidatesToAdd.length > 0
                                  ? ` (${visibleSavedCandidatesToAdd.length})`
                                  : ""}
                              </span>
                            </>
                          )}
                        </Button>
                      ) : undefined
                    }
                />
            </Suspense>

            {/* Mobile Itinerary Toggle */}
            {collection.itinerary && (
            <div className="lg:hidden">
                 {activeTab !== 'itinerary' && viewMode === 'map' && (
                    <div className="absolute top-4 right-4 z-40">
                        <Button
                            variant="secondary"
                            className="shadow-none rounded-full"
                            onClick={() => setActiveTab('itinerary')}
                        >
                            <ListFilter className="w-4 h-4 mr-2" />
                            Itinerary
                        </Button>
                    </div>
                 )}
            </div>
            )}
        </div>
      </div>

      {(showPlanRoute || hasPlanRouteOpened) && (
        <Suspense fallback={null}>
            <PlanRouteDialog
              open={showPlanRoute}
              onOpenChange={setShowPlanRoute}
              collectionId={collection.id}
              hasItinerary={!!collection.itinerary}
              onPlanGenerated={(action) => {
                  refetchItems();
                  queryClient.invalidateQueries({ queryKey: ["collection", slug, ownerProfile?.id] });
                  if (action === 'created') {
                    setActiveTab('itinerary');
                  } else if (action === 'removed') {
                    setActiveTab('items');
                  }
              }}
            />
        </Suspense>
      )}

      {(showSettings || hasSettingsOpened) && (
        <Suspense fallback={null}>
            <CollectionSettingsDialog
                open={showSettings}
                onOpenChange={setShowSettings}
                collection={collection}
                onUpdate={() => {
                    void queryClient.invalidateQueries({ queryKey: ["collection", slug, ownerProfile?.id] });
                    void queryClient.invalidateQueries({ queryKey: ["collection_items", collection.id] });
                    void queryClient.invalidateQueries({ queryKey: ["collection_members", collection.id] });
                    void queryClient.invalidateQueries({ queryKey: ["collection_stats", collection.id] });
                }}
                showSavedCandidates={showSavedCandidates}
                onShowSavedCandidatesChange={handleShowSavedCandidatesChange}
                savedPlacesDotFilter={savedPlacesDotFilter}
                onSavedPlacesDotFilterChange={handleSavedPlacesDotFilterChange}
                savedPlacesStatusFilter={savedPlacesStatusFilter}
                onSavedPlacesStatusFilterChange={handleSavedPlacesStatusFilterChange}
                isOwner={isOwner}
                canEdit={canEdit}
                initialTab={settingsInitialTab}
                currentUserId={user?.id}
                onPlanRoute={() => setShowPlanRoute(true)}
                onSaveAll={() => {
                    setShowSettings(false);
                    setShowSaveAllConfirm(true);
                }}
            />
        </Suspense>
      )}

      {canEdit && (
        <>
            {(showAddBuildings || hasAddBuildingsOpened) && (
              <Suspense fallback={null}>
                  <AddBuildingsToCollectionDialog
                      collectionId={collection.id}
                      existingBuildingIds={existingBuildingIds}
                      existingBuildings={mapBuildings.filter(b => !b.isMarker)}
                      hiddenBuildingIds={hiddenBuildingIds}
                      open={showAddBuildings}
                      onOpenChange={setShowAddBuildings}
                      onCollectionDataChanged={() => {
                        void refetchItems();
                      }}
                      returnTo={`/${username}/map/${slug}`}
                      justCreatedBuildingId={justCreatedBuildingId}
                  />
              </Suspense>
            )}

            <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove from Map</AlertDialogTitle>
                        <AlertDialogDescription>
                            Do you really want to remove <strong>{itemToRemove?.building.name}</strong> from this map?
                            {itemToRemove?.note && (
                                <>
                                    <br /><br />
                                    <strong>Note:</strong> The note attached to this building will also be deleted.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToRemove(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmRemove}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showRemoveMarkerConfirm} onOpenChange={setShowRemoveMarkerConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Marker</AlertDialogTitle>
                        <AlertDialogDescription>
                            Do you really want to remove <strong>{markerToRemove?.name}</strong> from this map?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setMarkerToRemove(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmRemoveMarker}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
      )}

      <AlertDialog open={showSaveAllConfirm} onOpenChange={setShowSaveAllConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Save Collection</AlertDialogTitle>
                <AlertDialogDescription>
                    This will save all buildings from this collection to your profile. Buildings you have already saved, visited, or hidden will be skipped.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSavingAll}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={(e) => {
                        e.preventDefault();
                        handleSaveAllBuildings();
                    }}
                    disabled={isSavingAll}
                >
                    {isSavingAll ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : "Save All"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showAddVisibleConfirm}
        onOpenChange={(open) => {
          setShowAddVisibleConfirm(open);
          if (!open) setBulkAddPreviewBuildings([]);
        }}
      >
        <AlertDialogContent className="max-h-[min(90vh,36rem)] gap-0 overflow-hidden rounded-none p-0 shadow-none sm:max-w-lg">
          <div className="border-b border-border-default px-6 pb-5 pt-6">
            <div className="flex gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center border border-border-default bg-surface-muted"
                aria-hidden
              >
                <MapPinPlus className="h-7 w-7 text-text-primary" strokeWidth={1.5} />
              </div>
              <AlertDialogHeader className="min-w-0 flex-1 space-y-3 text-left">
                <p className="text-2xs-plus font-medium uppercase tracking-widest text-text-secondary">
                  Saved places · current map view
                </p>
                <AlertDialogTitle className="text-xl font-semibold leading-tight tracking-tight">
                  Add saved places to collection
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base leading-relaxed text-text-secondary">
                  <span className="font-semibold text-text-primary">{bulkAddPreviewBuildings.length}</span>
                  {bulkAddPreviewBuildings.length === 1 ? " building " : " buildings "}
                  visible on the map will be added to{" "}
                  <span className="font-medium text-text-primary">{collection.name}</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-2xs-plus font-medium uppercase tracking-widest text-text-secondary">
                Preview
              </p>
              <Badge variant="secondary" className="rounded-none font-mono text-2xs tabular-nums">
                {bulkAddPreviewBuildings.length}
              </Badge>
            </div>
            <ScrollArea className="h-52 rounded-none border border-border-default bg-surface-default">
              <ul className="divide-y divide-border-default" role="list">
                {[...bulkAddPreviewBuildings]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((b, index) => (
                    <li
                      key={b.id}
                      className={cn(
                        "flex gap-3 px-4 py-2.5 text-sm text-text-primary",
                        index % 2 === 1 && "bg-surface-muted/50",
                      )}
                      role="listitem"
                    >
                      <Building2
                        className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="min-w-0 leading-snug">{b.name}</span>
                    </li>
                  ))}
              </ul>
            </ScrollArea>
          </div>

          <AlertDialogFooter className="border-t border-border-default bg-surface-muted px-6 py-4">
            <AlertDialogCancel disabled={isAddingVisibleCandidates}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmAddVisibleSavedCandidates();
              }}
              disabled={isAddingVisibleCandidates || bulkAddPreviewBuildings.length === 0}
            >
              {isAddingVisibleCandidates ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  Add {bulkAddPreviewBuildings.length}{" "}
                  {bulkAddPreviewBuildings.length === 1 ? "place" : "places"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
