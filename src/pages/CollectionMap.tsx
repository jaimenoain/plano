import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DiscoveryBuilding } from "@/features/search/components/types";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft, Map as MapIcon, List, Save, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { BuildingDiscoveryMap } from "@/components/common/BuildingDiscoveryMap";
import { AddBuildingsToCollectionDialog } from "@/components/collections/AddBuildingsToCollectionDialog";
import { CollectionSettingsDialog } from "@/components/profile/CollectionSettingsDialog";
import { parseLocation } from "@/utils/location";
import { getBoundsFromBuildings } from "@/utils/map";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  slug: string;
  show_community_images: boolean;
  rating_mode: string | null;
  rating_source_user_id: string | null;
}

export interface CollectionItemWithBuilding {
  id: string;
  building_id: string;
  note: string | null;
  building: {
    id: string;
    name: string;
    location_lat: number;
    location_lng: number;
    city: string | null;
    country: string | null;
    year_completed: number | null;
    hero_image_url: string | null;
    location_precision: "exact" | "approximate";
  };
}

export default function CollectionMap() {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Mobile view state
  const [activeTab, setActiveTab] = useState<"list" | "map">("map");

  // 1. Resolve Username to User ID
  const { data: profileData, isLoading: loadingProfile, error: profileError } = useQuery({
    queryKey: ["profile-by-username", username],
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

  const ownerId = profileData?.id;
  const isOwner = user?.id === ownerId;

  // 2. Fetch Collection Details
  const { data: collection, isLoading: loadingCollection } = useQuery({
    queryKey: ["collection-details", ownerId, slug],
    queryFn: async () => {
      if (!ownerId || !slug) return null;
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data as Collection;
    },
    enabled: !!ownerId && !!slug
  });

  // Check if user is a collaborator
  const { data: isCollaborator } = useQuery({
    queryKey: ["is-collaborator", collection?.id, user?.id],
    queryFn: async () => {
      if (!collection?.id || !user?.id) return false;
      const { data, error } = await supabase
        .from("collection_contributors")
        .select("user_id")
        .eq("collection_id", collection.id)
        .eq("user_id", user.id)
        .maybeSingle();

      return !!data;
    },
    enabled: !!collection?.id && !!user?.id && !isOwner
  });

  const canEdit = isOwner || !!isCollaborator;

  // 3. Fetch Collection Items with Buildings
  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["collection-items", collection?.id],
    queryFn: async () => {
      if (!collection?.id) return [];
      const { data, error } = await supabase
        .from("collection_items")
        .select(`
          id,
          building_id,
          note,
          building:buildings (
            id,
            name,
            location,
            city,
            country,
            year_completed,
            hero_image_url,
            location_precision
          )
        `)
        .eq("collection_id", collection.id)
        .order("order_index", { ascending: true });

      if (error) throw error;

      return (data as any[]).map(item => {
        const coords = parseLocation(item.building.location);
        return {
          ...item,
          building: {
            ...item.building,
            location_lat: coords?.lat || 0,
            location_lng: coords?.lng || 0
          }
        };
      }) as CollectionItemWithBuilding[];
    },
    enabled: !!collection?.id
  });

  // 4. Fetch Map Categorization Data
  const { data: overrideUserBuildingsMap } = useQuery({
    queryKey: ["collection-map-ratings", collection?.id, collection?.rating_mode, collection?.rating_source_user_id, items?.length],
    enabled: !!collection && !!items && collection.rating_mode !== 'viewer' && collection.rating_mode !== null,
    queryFn: async () => {
      if (!collection) return undefined;
      const buildingIds = items?.map(i => i.building.id) || [];
      if (buildingIds.length === 0) return new Map();

      let userIds: string[] = [];

      if (collection.rating_mode === 'contributors_max') {
        // Fetch contributors
        const { data: contribs } = await supabase
          .from("collection_contributors")
          .select("user_id")
          .eq("collection_id", collection.id);

        userIds = [collection.owner_id, ...(contribs?.map(c => c.user_id) || [])];
      } else if (collection.rating_mode === 'admins_max') {
        userIds = [collection.owner_id];
      } else if (collection.rating_mode === 'member' && collection.rating_source_user_id) {
        userIds = [collection.rating_source_user_id];
      } else {
        return undefined; // Handled by enabled, but fallback
      }

      if (userIds.length === 0) return new Map();

      // Fetch user_buildings for these users and buildings
      const { data: userBuildings } = await supabase
        .from("user_buildings")
        .select("building_id, status")
        .in("building_id", buildingIds)
        .in("user_id", userIds);

      if (!userBuildings) return new Map();

      // Aggregate
      const resultMap = new Map<string, string>();

      // Group by building
      const buildingsMap = new Map<string, string[]>();
      userBuildings.forEach(ub => {
         if (!buildingsMap.has(ub.building_id)) {
             buildingsMap.set(ub.building_id, []);
         }
         if (ub.status) buildingsMap.get(ub.building_id)?.push(ub.status);
      });

      // Calculate max priority
      buildingsMap.forEach((statuses, bId) => {
          if (statuses.includes('visited')) resultMap.set(bId, 'visited');
          else if (statuses.includes('pending')) resultMap.set(bId, 'pending');
      });

      return resultMap;
    }
  });

  // Mutation for updating notes
  const updateNoteMutation = useMutation({
    mutationFn: async ({ itemId, note }: { itemId: string; note: string }) => {
      const { error } = await supabase
        .from("collection_items")
        .update({ note })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note saved");
      queryClient.invalidateQueries({ queryKey: ["collection-items", collection?.id] });
    },
    onError: () => {
      toast.error("Failed to save note");
    }
  });

  const handleNoteBlur = (itemId: string, newNote: string, currentNote: string | null) => {
    if (newNote !== currentNote) {
        updateNoteMutation.mutate({ itemId, note: newNote });
    }
  };

  const mapBuildings = useMemo<DiscoveryBuilding[]>(() => {
    if (!items) return [];
    return items.map(item => ({
      id: item.building.id,
      name: item.building.name,
      location_lat: item.building.location_lat,
      location_lng: item.building.location_lng,
      city: item.building.city,
      country: item.building.country,
      year_completed: item.building.year_completed,
      main_image_url: item.building.hero_image_url,
      location_precision: item.building.location_precision,
      architects: [],
      styles: []
    }));
  }, [items]);

  const mapBounds = useMemo(() => {
    return getBoundsFromBuildings(mapBuildings);
  }, [mapBuildings]);

  const handleMarkerClick = (buildingId: string) => {
    setHighlightedId(buildingId);
    setActiveTab("list"); // Switch to list on mobile
    const ref = itemRefs.current.get(buildingId);
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const isLoading = loadingProfile || loadingCollection || loadingItems;
  const error = profileError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || (!loadingProfile && !profileData) || (!loadingCollection && !collection)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-background p-4 text-center">
        <h1 className="text-2xl font-bold">Collection Not Found</h1>
        <p className="text-muted-foreground">The collection you are looking for does not exist or is private.</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen supports-[height:100dvh]:h-[100dvh] w-full overflow-hidden bg-background">
        {/* Left Panel - List */}
        <div className={cn(
            "w-full md:w-[400px] lg:w-[450px] border-r flex flex-col h-full bg-background transition-transform duration-300 md:translate-x-0 absolute md:relative z-20",
            activeTab === "list" ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            <div className="p-4 border-b bg-background/95 backdrop-blur z-10 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                    <h1 className="text-xl font-bold truncate pr-2">{collection?.name}</h1>
                    {collection?.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{collection.description}</p>
                    )}
                </div>
                {isOwner && (
                    <div className="flex gap-2 shrink-0">
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => setIsAddDialogOpen(true)}
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Add</span>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setShowSettings(true)}
                        >
                            <Settings className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4 pb-20 md:pb-4">
                    {items?.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No buildings in this collection.</p>
                    )}
                    {items?.map(item => (
                        <div
                            key={item.id}
                            ref={(el) => {
                                if (el) itemRefs.current.set(item.building.id, el);
                                else itemRefs.current.delete(item.building.id);
                            }}
                            className={cn(
                                "p-4 border rounded-lg shadow-sm transition-all duration-200 cursor-pointer bg-card hover:shadow-md",
                                highlightedId === item.building.id ? "border-primary ring-1 ring-primary bg-secondary/10" : "hover:border-primary/50"
                            )}
                            onMouseEnter={() => setHighlightedId(item.building.id)}
                            onClick={() => {
                                setHighlightedId(item.building.id);
                                navigate(`/building/${item.building.id}`);
                            }}
                        >
                            <div className="flex gap-3">
                                {collection?.show_community_images && (item.building.hero_image_url ? (
                                    <div className="w-20 h-20 rounded-md overflow-hidden shrink-0 bg-secondary">
                                        <img src={item.building.hero_image_url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 rounded-md bg-secondary shrink-0 flex items-center justify-center text-muted-foreground text-xs p-1 text-center">
                                        No Image
                                    </div>
                                ))}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm truncate">{item.building.name}</h3>
                                    <p className="text-xs text-muted-foreground truncate">{item.building.city}, {item.building.country}</p>
                                    {item.building.year_completed && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{item.building.year_completed}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                {canEdit ? (
                                    <div className="relative">
                                        <Textarea
                                            placeholder="Add a note..."
                                            defaultValue={item.note || ""}
                                            onBlur={(e) => handleNoteBlur(item.id, e.target.value, item.note)}
                                            className="resize-none text-sm bg-background min-h-[60px]"
                                        />
                                        <div className="absolute bottom-2 right-2 opacity-50 pointer-events-none">
                                            <Save className="h-3 w-3" />
                                        </div>
                                    </div>
                                ) : item.note ? (
                                    <div className="bg-secondary/30 p-2 rounded-md text-sm italic text-muted-foreground border">
                                        "{item.note}"
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 relative h-full w-full">
            <BuildingDiscoveryMap
                externalBuildings={mapBuildings}
                highlightedId={highlightedId}
                onMarkerClick={handleMarkerClick}
                autoZoomOnLowCount={true}
                forcedBounds={mapBounds}
                showImages={collection?.show_community_images ?? true}
                overrideUserBuildingsMap={overrideUserBuildingsMap}
            />

            {/* Mobile Toggle Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-background/95 backdrop-blur border rounded-full shadow-lg p-1 md:hidden z-30">
                <Button
                    variant={activeTab === "map" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("map")}
                    className="rounded-full px-4"
                >
                    <MapIcon className="mr-2 h-4 w-4" /> Map
                </Button>
                <Button
                    variant={activeTab === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("list")}
                    className="rounded-full px-4"
                >
                    <List className="mr-2 h-4 w-4" /> List
                </Button>
            </div>
        </div>

        {collection && (
            <>
                <AddBuildingsToCollectionDialog
                    collectionId={collection.id}
                    existingBuildingIds={new Set(items?.map(i => i.building.id) ?? [])}
                    open={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                />
                <CollectionSettingsDialog
                    collection={collection}
                    open={showSettings}
                    onOpenChange={setShowSettings}
                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ["collection-details", ownerId, slug] })}
                />
            </>
        )}
    </div>
  );
}
