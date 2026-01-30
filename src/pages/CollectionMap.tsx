import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { BuildingDiscoveryMap } from "@/components/common/BuildingDiscoveryMap";
import { CollectionBuildingCard } from "@/components/collections/CollectionBuildingCard";
import { parseLocation } from "@/utils/location";
import { getBoundsFromBuildings } from "@/utils/map";
import { Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollectionSettingsDialog } from "@/components/profile/CollectionSettingsDialog";
import { Collection, CollectionItemWithBuilding } from "@/types/collection";
import { DiscoveryBuilding } from "@/features/search/components/types";

export default function CollectionMap() {
  const { username, slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 1. Resolve User (Owner)
  const { data: profile, isLoading: loadingProfile } = useQuery({
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
    queryKey: ["collection", slug, profile?.id],
    queryFn: async () => {
      if (!profile?.id || !slug) return null;
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("owner_id", profile.id)
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data as Collection;
    },
    enabled: !!profile?.id && !!slug
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
            year_completed,
            hero_image_url,
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

  const isLoading = loadingProfile || loadingCollection || loadingItems;
  const canEdit = user?.id === collection?.owner_id;

  // 4. Fetch Aggregated Stats
  const shouldFetchStats = ['status', 'rating_member', 'rating_admin'].includes(collection?.categorization_method || '');

  const { data: aggregatedStats } = useQuery({
      queryKey: ["collection_aggregated_stats", collection?.id, collection?.categorization_method, items?.length],
      queryFn: async () => {
          if (!collection || !items || items.length === 0) return null;
          const buildingIds = items.map(i => i.building.id);

          // Fetch contributors
          const { data: contributors } = await supabase
             .from("collection_contributors")
             .select("user_id")
             .eq("collection_id", collection.id);

          let contributorIds = contributors ? contributors.map((c: any) => c.user_id) : [];
          if (!contributorIds.includes(collection.owner_id)) {
              contributorIds.push(collection.owner_id);
          }

          let targetUserIds = contributorIds;

          if (collection.categorization_method === 'rating_admin') {
              const { data: profiles } = await supabase
                  .from("profiles")
                  .select("id, role")
                  .in("id", contributorIds);

              targetUserIds = profiles?.filter((p: any) => p.role === 'admin' || p.role === 'curator').map((p: any) => p.id) || [];

              if (targetUserIds.length === 0) return { map: new Map(), contributorsCount: 0 };
          }

          // Use maybeSingle if just one building, but here likely multiple.
          // Note: .in() works well for IDs.
          const { data: userBuildings } = await supabase
              .from("user_buildings")
              .select("building_id, status, rating, user_id")
              .in("building_id", buildingIds)
              .in("user_id", targetUserIds);

          if (!userBuildings) return { map: new Map(), contributorsCount: targetUserIds.length };

          const buildingStats = new Map<string, { visitedCount: number, maxRating: number, savedCount: number }>();

          userBuildings.forEach((ub: any) => {
              const stats = buildingStats.get(ub.building_id) || { visitedCount: 0, maxRating: 0, savedCount: 0 };

              if (ub.status === 'visited') {
                  stats.visitedCount++;
              }
              if (ub.status === 'pending') {
                  stats.savedCount++;
              }

              if (ub.rating) {
                  stats.maxRating = Math.max(stats.maxRating, ub.rating);
              }

              buildingStats.set(ub.building_id, stats);
          });

          return { map: buildingStats, contributorsCount: targetUserIds.length };
      },
      enabled: shouldFetchStats && !!items && items.length > 0
  });

  // Prepare map buildings
  const mapBuildings = useMemo<DiscoveryBuilding[]>(() => {
    if (!items) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.map(item => {
        const base = {
            id: item.building.id,
            name: item.building.name,
            main_image_url: item.building.hero_image_url,
            location_lat: item.building.location_lat,
            location_lng: item.building.location_lng,
            city: item.building.city,
            country: item.building.country,
            year_completed: item.building.year_completed,
            location_precision: item.building.location_precision,
            architects: item.building.building_architects?.map((ba: any) => ba.architects) || [],
            styles: [],
        };

        let displayProperties = undefined;

        if (collection?.categorization_method === 'custom' && item.custom_category_id) {
            const cat = collection.custom_categories?.find(c => c.id === item.custom_category_id);
            if (cat) {
                displayProperties = {
                    strokeColor: cat.color,
                    fillColor: cat.color,
                    tooltipText: cat.label
                };
            }
        } else if (aggregatedStats && ['status', 'rating_member', 'rating_admin'].includes(collection?.categorization_method || '')) {
             const stats = aggregatedStats.map.get(item.building.id);
             const totalUsers = aggregatedStats.contributorsCount;

             if (collection?.categorization_method === 'status') {
                 if (stats && stats.visitedCount >= totalUsers && totalUsers > 0) {
                     displayProperties = { strokeColor: '#4CAF50', fillColor: '#4CAF50', tooltipText: 'Visited by All' };
                 } else if (stats && stats.visitedCount > 0) {
                     displayProperties = { strokeColor: '#FF9800', fillColor: '#FF9800', tooltipText: 'Visited by Some' };
                 } else {
                     displayProperties = { strokeColor: '#F44336', fillColor: '#F44336', tooltipText: 'Not Visited' };
                 }
             } else if (collection?.categorization_method?.startsWith('rating')) {
                 const rating = stats?.maxRating || 0;
                 if (rating === 3) {
                     displayProperties = { strokeColor: '#FFD700', fillColor: '#FFD700', tooltipText: 'Masterpiece (3 Circles)' };
                 } else if (rating === 2) {
                     displayProperties = { strokeColor: '#C0C0C0', fillColor: '#C0C0C0', tooltipText: 'Essential (2 Circles)' };
                 } else if (rating === 1) {
                     displayProperties = { strokeColor: '#CD7F32', fillColor: '#CD7F32', tooltipText: 'Impressive (1 Circle)' };
                 } else if (stats?.savedCount > 0 || stats?.visitedCount > 0) {
                      displayProperties = { strokeColor: '#2196F3', fillColor: '#2196F3', tooltipText: 'Saved' };
                 }
             }
        }

        return {
            ...base,
            displayProperties
        };
    });
  }, [items, collection, aggregatedStats]);

  const bounds = useMemo(() => {
    if (mapBuildings.length === 0) return null;
    return getBoundsFromBuildings(mapBuildings);
  }, [mapBuildings]);

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
    <AppLayout title={collection.name} showBack>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">

        {/* Sidebar List */}
        <div className="w-full lg:w-[400px] bg-background border-r flex flex-col shrink-0 lg:h-full h-[40vh] order-2 lg:order-1">
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h1 className="font-bold text-xl truncate">{collection.name}</h1>
                    {collection.description && <p className="text-sm text-muted-foreground line-clamp-2">{collection.description}</p>}
                </div>
                {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                        <Settings className="h-5 w-5 text-muted-foreground" />
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
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
                                    // Focus on map logic could be here, but highlightedId handles most of it
                                }}
                                categorizationMethod={collection.categorization_method}
                                customCategories={collection.custom_categories}
                                onUpdateCategory={(catId) => handleUpdateCategory(item.id, catId)}
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
        <div className="flex-1 relative lg:h-full h-[60vh] order-1 lg:order-2">
            <BuildingDiscoveryMap
                externalBuildings={mapBuildings}
                highlightedId={highlightedId}
                onMarkerClick={(id) => setHighlightedId(id)}
                forcedBounds={bounds}
                showImages={collection.show_community_images}
            />
        </div>
      </div>

      {canEdit && (
        <CollectionSettingsDialog
            open={showSettings}
            onOpenChange={setShowSettings}
            collection={collection}
            onUpdate={() => {
                refetchItems();
                window.location.reload();
            }}
        />
      )}
    </AppLayout>
  );
}
