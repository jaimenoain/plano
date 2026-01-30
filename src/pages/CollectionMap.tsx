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

  // Prepare map buildings
  const mapBuildings = useMemo<DiscoveryBuilding[]>(() => {
    if (!items) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.map(item => ({
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
    }));
  }, [items]);

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
    <AppLayout title={collection.name} showBack isFullScreen>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">

        {/* Sidebar List */}
        <div className="w-full lg:w-[450px] bg-background border-r flex flex-col shrink-0 lg:h-full h-[40vh] order-2 lg:order-1">
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
