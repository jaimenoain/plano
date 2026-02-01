import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { BuildingDiscoveryMap } from "@/components/common/BuildingDiscoveryMap";
import { CollectionBuildingCard } from "@/components/collections/CollectionBuildingCard";
import { parseLocation } from "@/utils/location";
import { getBoundsFromBuildings } from "@/utils/map";
import { getBuildingUrl } from "@/utils/url";
import { Loader2, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollectionSettingsDialog } from "@/components/profile/CollectionSettingsDialog";
import { AddBuildingsToCollectionDialog } from "@/components/collections/AddBuildingsToCollectionDialog";
import { Collection, CollectionItemWithBuilding } from "@/types/collection";
import { DiscoveryBuilding } from "@/features/search/components/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

export default function CollectionMap() {
  const { username, slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddBuildings, setShowAddBuildings] = useState(false);

  // New States
  const [showSavedCandidates, setShowSavedCandidates] = useState(false);
  const [candidateToAdd, setCandidateToAdd] = useState<DiscoveryBuilding | null>(null);
  const [showAddConfirm, setShowAddConfirm] = useState(false);

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

  // 3. Fetch Items
  const { data: items, isLoading: loadingItems, refetch: refetchItems } = useQuery({
    queryKey: ["collection_items", collection?.id],
    queryFn: async () => {
      if (!collection?.id) return [];
      const { data, error } = await supabase
        .from("collection_items")
        .select(`
          id,
          building_id,
          note,
          custom_category_id,
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
        .eq("collection_id", collection.id);

      if (error) throw error;

      // Transform and parse location
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((item: any) => {
        const location = parseLocation(item.building.location);
        return {
          ...item,
          building: {
            ...item.building,
            location_lat: location?.lat || 0,
            location_lng: location?.lng || 0,
          }
        };
      }) as CollectionItemWithBuilding[];
    },
    enabled: !!collection?.id
  });

  const existingBuildingIds = useMemo(() => {
    return new Set(items?.map(item => item.building.id) || []);
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
            location_precision
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["visited", "pending"]);

      if (error) throw error;

      // Filter out items already in collection and transform
      return data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((row: any) => row.building)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) => {
            const location = parseLocation(row.building.location);
            return {
                id: row.building.id,
                name: row.building.name,
                main_image_url: row.building.hero_image_url || row.building.community_preview_url,
                location_lat: location?.lat || 0,
                location_lng: location?.lng || 0,
                city: row.building.city,
                country: row.building.country,
                slug: row.building.slug,
                short_id: row.building.short_id,
                year_completed: row.building.year_completed,
                location_precision: row.building.location_precision,
                architects: [], // Not critical for candidate markers
                styles: [],
                color: null // Let BuildingDiscoveryMap use status color
            } as DiscoveryBuilding;
        })
        .filter(b => b.location_lat !== 0 && b.location_lng !== 0);
    },
    enabled: !!user?.id && showSavedCandidates // Only fetch if toggle is ON (or always fetch? efficient to fetch only on toggle)
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

  const isLoading = loadingProfile || loadingCollection || loadingItems;
  const canEdit = user?.id === collection?.owner_id;

  // Prepare map buildings
  const mapBuildings = useMemo<DiscoveryBuilding[]>(() => {
    if (!items) return [];

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

    return items.map(item => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        architects: item.building.building_architects?.map((ba: any) => ba.architects) || [],
        styles: [],
        color: color,
      };
    });
  }, [items, collection, statsData, memberIds, shouldFetchStats]);

  const allMapBuildings = useMemo(() => {
    if (showSavedCandidates && savedCandidates) {
      const filteredCandidates = savedCandidates.filter(c => !existingBuildingIds.has(c.id));
      return [...mapBuildings, ...filteredCandidates];
    }
    return mapBuildings;
  }, [mapBuildings, savedCandidates, showSavedCandidates, existingBuildingIds]);

  const bounds = useMemo(() => {
    if (allMapBuildings.length === 0) return null;
    return getBoundsFromBuildings(allMapBuildings);
  }, [allMapBuildings]);

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

  const handleAddToCollection = async () => {
    if (!candidateToAdd || !collection?.id) return;

    const { error } = await supabase
        .from("collection_items")
        .insert({
            collection_id: collection.id,
            building_id: candidateToAdd.id
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
            description: `${candidateToAdd.name} added to collection.`
        });
        refetchItems();
        // Invalidate saved candidates to refresh the list (it should disappear from candidates)
        queryClient.invalidateQueries({ queryKey: ["saved_candidates"] });
    }
    setShowAddConfirm(false);
    setCandidateToAdd(null);
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
      <div className="flex flex-col lg:flex-row h-[calc(100dvh_-_9rem_-_env(safe-area-inset-bottom))] overflow-hidden">

        {/* Sidebar List */}
        <div className="w-full lg:w-[450px] bg-background border-r flex flex-col shrink-0 lg:h-full h-[40%] order-2 lg:order-1">
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h1 className="font-bold text-xl truncate">{collection.name}</h1>
                    <div className="text-sm text-muted-foreground mb-1">
                      By: <Link to={`/profile/${ownerProfile?.username}`} className="hover:underline text-foreground">{ownerProfile?.username}</Link>
                    </div>
                    {collection.description && <p className="text-sm text-muted-foreground line-clamp-2">{collection.description}</p>}
                </div>
                {canEdit && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 mr-2">
                            <Label htmlFor="show-saved" className="text-xs whitespace-nowrap hidden sm:block">Show saved</Label>
                            <Switch
                                id="show-saved"
                                checked={showSavedCandidates}
                                onCheckedChange={setShowSavedCandidates}
                            />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowAddBuildings(true)}>
                            <Plus className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                            <Settings className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3 pb-24">
                    {items && items.length > 0 ? (
                        items.map(item => (
                            <CollectionBuildingCard
                                key={item.id}
                                item={item}
                                isHighlighted={highlightedId === item.building.id}
                                setHighlightedId={setHighlightedId}
                                canEdit={canEdit}
                                onUpdateNote={(note) => handleUpdateNote(item.id, note)}
                                onNavigate={() => {
                                    navigate(getBuildingUrl(item.building.id, item.building.slug, item.building.short_id));
                                }}
                                categorizationMethod={collection.categorization_method}
                                customCategories={collection.custom_categories}
                                onUpdateCategory={(catId) => handleUpdateCategory(item.id, catId)}
                                showImages={collection.show_community_images ?? true}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No places in this collection yet.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>

        {/* Map */}
        <div className="flex-1 relative lg:h-full h-[60%] order-1 lg:order-2">
            <BuildingDiscoveryMap
                externalBuildings={allMapBuildings}
                highlightedId={highlightedId}
                onMarkerClick={(id) => {
                  setHighlightedId(id);
                  
                  // 1. Check if the building is already in the collection
                  if (existingBuildingIds.has(id)) {
                      const building = mapBuildings.find(b => b.id === id);
                      
                      // NOTE: The Main branch was using window.open(..., '_blank').
                      // The Feature branch uses navigate(). 
                      // Use window.open here if you strictly want new tabs.
                      if (building) {
                        window.open(getBuildingUrl(building.id, building.slug, building.short_id), '_blank');
                      } else {
                        window.open(`/building/${id}`, '_blank');
                      }
                  } 
                  // 2. If not in collection, treat as a "Candidate" (Feature Branch Logic)
                  else {
                      const building = savedCandidates?.find(b => b.id === id);
                      if (building) {
                          setCandidateToAdd(building);
                          setShowAddConfirm(true);
                      }
                  }
                }}
                forcedBounds={bounds}
                showImages={collection.show_community_images ?? true}
            />
        </div>
      </div>

      {canEdit && (
        <>
            <CollectionSettingsDialog
                open={showSettings}
                onOpenChange={setShowSettings}
                collection={collection}
                onUpdate={() => {
                    refetchItems();
                    window.location.reload();
                }}
            />
            <AddBuildingsToCollectionDialog
                collectionId={collection.id}
                existingBuildingIds={existingBuildingIds}
                open={showAddBuildings}
                onOpenChange={setShowAddBuildings}
            />

            <AlertDialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Add to Map</AlertDialogTitle>
                        <AlertDialogDescription>
                            Do you want to add <strong>{candidateToAdd?.name}</strong> to this map?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCandidateToAdd(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAddToCollection}>Add</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
      )}
    </AppLayout>
  );
}
