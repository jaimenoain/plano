import { useEffect, useState, useMemo, Suspense, lazy } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { parseLocation } from "@/utils/location";
import { getBoundsFromBuildings, type Bounds } from "@/utils/map";
import { getBuildingUrl } from "@/utils/url";
import { Loader2, Settings, Plus, ExternalLink, Bookmark, Star, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SearchModeToggle } from "@/features/search/components/SearchModeToggle";
import { Collection, CollectionItemWithBuilding, CollectionMarker } from "@/types/collection";

import { DiscoveryBuilding } from "@/features/search/components/types";
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
import { useToast } from "@/components/ui/use-toast";

const CollectionSettingsDialog = lazy(() => import("@/components/profile/CollectionSettingsDialog").then(module => ({ default: module.CollectionSettingsDialog })));
const AddBuildingsToCollectionDialog = lazy(() => import("@/components/collections/AddBuildingsToCollectionDialog").then(module => ({ default: module.AddBuildingsToCollectionDialog })));
const BuildingDiscoveryMap = lazy(() => import("./BuildingDiscoveryMap").then(module => ({ default: module.BuildingDiscoveryMap })));
const CollectionBuildingCard = lazy(() => import("@/components/collections/CollectionBuildingCard").then(module => ({ default: module.CollectionBuildingCard })));
const CollectionMarkerCard = lazy(() => import("@/components/collections/CollectionMarkerCard").then(module => ({ default: module.CollectionMarkerCard })));

interface CollectionItemResponse {
  id: string;
  building_id: string;
  note: string | null;
  custom_category_id: string | null;
  is_hidden: boolean;
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
    building_architects: {
      architects: {
        id: string;
        name: string;
      } | null;
    }[];
  } | null;
}

interface SavedCandidateResponse {
  building_id: string;
  status: string;
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
    building_architects: {
      architects: {
        id: string;
        name: string;
      } | null;
    }[];
  } | null;
}

export default function CollectionMap() {
  const { username, slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddBuildings, setShowAddBuildings] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // New States
  const [showSavedCandidates, setShowSavedCandidates] = useState(false);

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

  // Check if user is a contributor
  const { data: isContributor } = useQuery({
    queryKey: ["is_contributor", collection?.id, user?.id],
    queryFn: async () => {
      if (!collection?.id || !user?.id) return false;
      const { count } = await supabase
        .from("collection_contributors")
        .select("*", { count: 'exact', head: true })
        .eq("collection_id", collection.id)
        .eq("user_id", user.id);
      return (count || 0) > 0;
    },
    enabled: !!collection?.id && !!user?.id
  });

  const isOwner = user?.id === collection?.owner_id;
  const canEdit = isOwner || !!isContributor;

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
            building_architects(architects(id, name))
          )
        `)
        .eq("collection_id", collection.id)
        .returns<CollectionItemResponse[]>();

      const markersPromise = supabase
        .from("collection_markers")
        .select("*")
        .eq("collection_id", collection.id);

      const [itemsResult, markersResult] = await Promise.all([itemsPromise, markersPromise]);

      if (itemsResult.error) throw itemsResult.error;
      if (markersResult.error) throw markersResult.error;

      // Transform and parse location for items
      const items = itemsResult.data
        .filter(item => item.building) // Filter out items with deleted buildings
        .map((item) => {
          const b = item.building!;
          const location = parseLocation(b.location);
          return {
            id: item.id,
            building_id: item.building_id,
            note: item.note,
            custom_category_id: item.custom_category_id,
            is_hidden: item.is_hidden,
            building: {
              ...b,
              location_lat: location?.lat || 0,
              location_lng: location?.lng || 0,
              building_architects: b.building_architects || [],
            }
          };
        }) as CollectionItemWithBuilding[];

      return {
        items,
        markers: markersResult.data as CollectionMarker[]
      };
    },
    enabled: !!collection?.id
  });

  const items = collectionData?.items || [];
  const markers = collectionData?.markers || [];

  const existingBuildingIds = useMemo(() => {
    return new Set(items.map(item => item.building.id) || []);
  }, [items]);

  const hiddenBuildingIds = useMemo(() => {
    return new Set(items.filter(item => item.is_hidden).map(item => item.building.id) || []);
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
            building_architects(architects(id, name))
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["visited", "pending"])
        .returns<SavedCandidateResponse[]>();

      if (error) throw error;

      // Filter out items already in collection and transform
      return data
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
                architects: b.building_architects?.map((ba) => ba.architects).filter(Boolean) || [],
                styles: [],
                color: null // Let BuildingDiscoveryMap use status color
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
            statsData.forEach(row => {
                if (!statsMap.has(row.building_id)) {
                    statsMap.set(row.building_id, { visitedCount: 0, maxRating: 0, hasSaved: false });
                }
                const stat = statsMap.get(row.building_id)!;
                if (row.status === 'visited') stat.visitedCount++;
                if (row.rating && row.rating > stat.maxRating) stat.maxRating = row.rating;
                stat.hasSaved = true; // Present in user_buildings implies saved/interested
            });
        }

        const mappedBuildings = visibleItems.map(item => {
        let color = null;

        if (collection?.categorization_method === 'custom') {
            if (item.custom_category_id) {
            const category = collection.custom_categories?.find(c => c.id === item.custom_category_id);
            if (category) {
                color = category.color;
            } else {
                color = "#9CA3AF";
            }
            } else {
            color = "#9CA3AF";
            }
        } else if (collection?.categorization_method === 'uniform') {
            color = "#000000";
        } else if (shouldFetchStats && statsData && memberIds) {
            const stat = statsMap.get(item.building.id);
            const targetUserIds = collection?.categorization_selected_members && collection.categorization_selected_members.length > 0
                ? collection.categorization_selected_members
                : memberIds;
            const targetCount = targetUserIds.length;

            if (collection.categorization_method === 'status') {
                if (!stat || stat.visitedCount === 0) {
                    color = "#9E9E9E"; // Not visited (Grey)
                } else {
                    if (stat.visitedCount >= targetCount && targetCount > 0) {
                        color = "#4CAF50"; // Visited by All (Green)
                    } else if (stat.visitedCount > 0) {
                        color = "#FF9800"; // Visited by Some (Orange)
                    }
                }
            } else if (collection.categorization_method === 'rating_member') {
                if (!stat || !stat.hasSaved) {
                    // No color (default) or grey?
                    // If we want to highlight rated ones, unrated/unsaved can be default or grey.
                    // Let's make them grey to indicate "no data/rating".
                    color = "#9E9E9E";
                } else {
                    if (stat.maxRating === 3) color = "#FFD700"; // Gold
                    else if (stat.maxRating === 2) color = "#C0C0C0"; // Silver
                    else if (stat.maxRating === 1) color = "#CD7F32"; // Bronze
                    else color = "#2196F3"; // Saved (Blue)
                }
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
            architects: item.building.building_architects?.map((ba) => ba.architects).filter(Boolean) || [],
            styles: [],
            color: color,
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
            architects: [],
            styles: [],
            year_completed: null,
            isMarker: true,
            markerCategory: marker.category,
            notes: marker.notes,
            address: marker.address,
            // Use a default marker color if needed, or rely on icon in Map
            color: "#6B7280"
        } as DiscoveryBuilding));
        buildingNodes.push(...mappedMarkers);
    }

    return buildingNodes;
  }, [items, markers, collection, statsData, memberIds, shouldFetchStats]);

  const allMapBuildings = useMemo(() => {
    if (showSavedCandidates && savedCandidates) {
      const filteredCandidates = savedCandidates.filter(c => !existingBuildingIds.has(c.id));
      const dimmedExisting = mapBuildings.map(b => ({ ...b, isDimmed: true }));
      return [...dimmedExisting, ...filteredCandidates.map(c => ({ ...c, isCandidate: true }))];
    }
    return mapBuildings;
  }, [mapBuildings, savedCandidates, showSavedCandidates, existingBuildingIds]);

  // Calculate bounds only once when buildings are loaded to prevent map movement on updates
  useEffect(() => {
    if (!initialBounds && mapBuildings.length > 0) {
      setInitialBounds(getBoundsFromBuildings(mapBuildings));
    }
  }, [mapBuildings, initialBounds]);

  // Reset bounds when switching collections
  useEffect(() => {
    setInitialBounds(null);
  }, [slug]);

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

  const handleHideCandidate = async (buildingId: string) => {
    if (!collection?.id) return;

    const { error } = await supabase
        .from("collection_items")
        .insert({
            collection_id: collection.id,
            building_id: buildingId,
            is_hidden: true
        });

    if (error) {
        toast({
            title: "Error",
            description: "Failed to hide building.",
            variant: "destructive"
        });
    } else {
        toast({
            title: "Hidden",
            description: "Building hidden from suggestions."
        });
        queryClient.invalidateQueries({ queryKey: ["saved_candidates"] });
        queryClient.invalidateQueries({ queryKey: ["collection_items", collection.id] });
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
        navigate("/auth");
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

    } catch (error) {
        console.error('Error saving collection:', error);
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!collection) {
    return (
      <AppLayout title="Not Found" showBack>
        <div className="flex items-center justify-center h-[calc(100vh-64px)] text-muted-foreground">
          Collection not found
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={collection.name} showBack isFullScreen>
      <div className="flex flex-col lg:flex-row h-[calc(100dvh_-_9rem_-_env(safe-area-inset-bottom))] md:h-[100dvh] overflow-hidden relative">
        <div className="lg:hidden">
          <SearchModeToggle
            mode={viewMode}
            onModeChange={setViewMode}
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50"
          />
        </div>

        {/* Sidebar List */}
        <div className={cn(
          "w-full lg:w-[450px] bg-background border-r flex-col shrink-0 lg:h-full lg:order-1 lg:flex",
          viewMode === 'list' ? "h-full flex order-2" : "hidden"
        )}>
            <div className="p-4 border-b flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h1 className="font-bold text-xl truncate">{collection.name}</h1>
                    <div className="text-sm text-muted-foreground mb-1">
                      By: <Link to={`/profile/${ownerProfile?.username}`} className="hover:underline text-foreground">{ownerProfile?.username}</Link>
                    </div>
                    {collection.description && <p className="text-sm text-muted-foreground line-clamp-2">{collection.description}</p>}
                    {collection.external_link && (
                        <Button variant="outline" size="sm" className="mt-2 h-8" asChild>
                            <a href={collection.external_link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-2" />
                                Visit Link
                            </a>
                        </Button>
                    )}
                </div>
                {canEdit && (
                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setShowAddBuildings(true)}>
                            <Plus className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                            <Settings className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                )}
                {!canEdit && (
                    <div className="flex items-center gap-2 shrink-0">
                        {user && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleToggleFavorite}
                                className="text-muted-foreground hover:text-yellow-500"
                            >
                                <Star className={cn("h-5 w-5", isFavorite ? "fill-yellow-500 text-yellow-500" : "")} />
                            </Button>
                        )}
                         <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                            <ListFilter className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3 pb-24">
                    {items && items.filter(i => !i.is_hidden).length > 0 && (
                        <Suspense fallback={
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        }>
                            {items.filter(i => !i.is_hidden).map(item => (
                                <CollectionBuildingCard
                                    key={item.id}
                                    item={item}
                                    isHighlighted={highlightedId === item.building.id}
                                    setHighlightedId={setHighlightedId}
                                    canEdit={canEdit}
                                    onUpdateNote={(note) => handleUpdateNote(item.id, note)}
                                    onNavigate={() => {
                                        window.open(getBuildingUrl(item.building.id, item.building.slug, item.building.short_id), '_blank');
                                    }}
                                    categorizationMethod={collection.categorization_method}
                                    customCategories={collection.custom_categories}
                                    onUpdateCategory={(catId) => handleUpdateCategory(item.id, catId)}
                                    showImages={collection.show_community_images ?? true}
                                    onRemove={() => handleRemoveItem(item.building.id)}
                                />
                            ))}
                        </Suspense>
                    )}

                    {markers && markers.length > 0 && (
                        <div className="mt-4 border-t pt-2">
                            <Accordion type="single" collapsible defaultValue="markers">
                                <AccordionItem value="markers" className="border-none">
                                    <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold text-muted-foreground">
                                        Trip Logistics
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 pt-2">
                                            <Suspense fallback={<div className="p-2 text-center text-xs text-muted-foreground">Loading markers...</div>}>
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
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No places in this collection yet.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>

        {/* Map */}
        <div className={cn(
          "flex-1 relative lg:h-full lg:order-2 lg:flex",
          viewMode === 'map' ? "h-full flex order-1" : "hidden"
        )}>
            <Suspense fallback={
                <div className="flex items-center justify-center h-full w-full bg-muted/20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }>
                <BuildingDiscoveryMap
                    externalBuildings={allMapBuildings}
                    highlightedId={highlightedId}
                    onAddCandidate={handleAddToCollection}
                    onHideCandidate={canEdit ? handleHideCandidate : undefined}
                    onRemoveItem={canEdit ? handleRemoveItem : undefined}
                    onMarkerClick={(id) => {
                      setHighlightedId(id);
                      
                      // 1. Check if the building is already in the collection
                      if (existingBuildingIds.has(id)) {
                          const building = mapBuildings.find(b => b.id === id);

                          if (building) {
                            window.open(getBuildingUrl(building.id, building.slug, building.short_id), '_blank');
                          } else {
                            window.open(`/building/${id}`, '_blank');
                          }
                      }
                      // 2. If not in collection, just highlight it (Tooltip will show with Add button)
                    }}
                    forcedBounds={initialBounds}
                    showImages={collection.show_community_images ?? true}
                    onUpdateMarkerNote={canEdit ? handleUpdateMarkerNote : undefined}
                    onRemoveMarker={canEdit ? handleRemoveItem : undefined}
                    onClosePopup={() => setHighlightedId(null)}
                    showSavedCandidates={showSavedCandidates}
                />
            </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
          <CollectionSettingsDialog
              open={showSettings}
              onOpenChange={setShowSettings}
              collection={collection}
              onUpdate={() => {
                  refetchItems();
                  window.location.reload();
              }}
              showSavedCandidates={showSavedCandidates}
              onShowSavedCandidatesChange={setShowSavedCandidates}
              isOwner={isOwner}
              canEdit={canEdit}
              currentUserId={user?.id}
              onSaveAll={() => {
                  setShowSettings(false);
                  setShowSaveAllConfirm(true);
              }}
          />
      </Suspense>

      {canEdit && (
        <>
            <Suspense fallback={null}>
                <AddBuildingsToCollectionDialog
                    collectionId={collection.id}
                    existingBuildingIds={existingBuildingIds}
                    existingBuildings={mapBuildings.filter(b => !b.isMarker)}
                    hiddenBuildingIds={hiddenBuildingIds}
                    open={showAddBuildings}
                    onOpenChange={setShowAddBuildings}
                />
            </Suspense>

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
    </AppLayout>
  );
}
