import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Check, Search, X, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getBuildingImageUrl } from "@/utils/image";
import { BuildingDetailPanel } from "@/components/collections/BuildingDetailPanel";
import { DiscoveryList } from "@/features/search/components/DiscoveryList";
import { DiscoveryBuilding } from "@/features/search/components/types";
import { useDebounce } from "@/hooks/useDebounce";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

interface AddBuildingsToCollectionDialogProps {
  collectionId: string;
  existingBuildingIds: Set<string>;
  hiddenBuildingIds?: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mapGoogleTypeToCategory = (types: string[] = []): "accommodation" | "dining" | "transport" | "attraction" | "other" => {
  if (types.some(t => ["restaurant", "cafe", "bar", "bakery", "meal_takeaway", "meal_delivery", "food"].includes(t))) {
    return "dining";
  }
  if (types.some(t => ["lodging", "hotel", "motel", "hostel", "guesthouse"].includes(t))) {
    return "accommodation";
  }
  if (types.some(t => ["transit_station", "subway_station", "bus_station", "train_station", "airport", "taxi_stand", "light_rail_station"].includes(t))) {
    return "transport";
  }
  if (types.some(t => ["museum", "park", "tourist_attraction", "point_of_interest", "art_gallery", "amusement_park", "aquarium", "zoo"].includes(t))) {
    return "attraction";
  }

  return "other";
};

function OtherMarkersSearch({ collectionId, userId }: { collectionId: string, userId: string }) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const initMap = async () => {
      if (window.google?.maps?.places) {
        setScriptLoaded(true);
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error("VITE_GOOGLE_MAPS_API_KEY is missing");
        setHasError(true);
        return;
      }

      try {
        setOptions({
          key: apiKey,
          version: "weekly",
        });

        await importLibrary("places");
        await importLibrary("geocoding");

        setScriptLoaded(true);
      } catch (error) {
        console.error("Error loading Google Maps script", error);
        setHasError(true);
      }
    };

    initMap();
  }, []);

  if (hasError) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading Google Maps. Please try again later.
      </div>
    );
  }

  if (!scriptLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <PlacesAutocomplete collectionId={collectionId} userId={userId} />;
}

function PlacesAutocomplete({ collectionId, userId }: { collectionId: string, userId: string }) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    initOnMount: true,
  });

  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (address: string, placeId: string, mainText: string) => {
    setValue(address, false);
    clearSuggestions();
    setOpen(false);

    try {
      const results = await getGeocode({ placeId });
      const { lat, lng } = getLatLng(results[0]);
      const types = results[0].types;
      const category = mapGoogleTypeToCategory(types);

      const { error } = await supabase
        .from("collection_markers")
        .insert({
          collection_id: collectionId,
          google_place_id: placeId,
          name: mainText,
          category: category,
          lat: lat,
          lng: lng,
          address: address,
          created_by: userId
        });

      if (error) throw error;

      toast.success("Marker added to collection");
      setValue("", false); // Clear input after successful add
      queryClient.invalidateQueries({ queryKey: ["collection_markers", collectionId] });
    } catch (error) {
      console.error("Error adding marker:", error);
      toast.error("Failed to add marker");
    }
  };

  return (
    <div className="p-4 relative" ref={commandRef}>
      <Command shouldFilter={false} className="overflow-visible bg-transparent border rounded-md">
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
          <CommandPrimitive.Input
            value={value}
            onValueChange={(val) => {
              setValue(val);
              setOpen(!!val);
            }}
            onFocus={() => setOpen(!!value)}
            disabled={!ready}
            placeholder="Search for a place (e.g. 'Eiffel Tower')..."
            autoComplete="off"
            className={cn(
              "flex h-10 w-full rounded-md border-none bg-transparent pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>

        {open && (status === "OK" || status === "ZERO_RESULTS") && (
          <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
            <CommandList>
              <CommandGroup>
                {status === "OK" &&
                  data.map(({ place_id, description, structured_formatting }) => (
                    <CommandItem
                      key={place_id}
                      value={description}
                      onSelect={() => handleSelect(description, place_id, structured_formatting?.main_text || description)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 shrink-0" />
                      <span>{description}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
              {status === "ZERO_RESULTS" && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
            </CommandList>
          </div>
        )}
      </Command>
      <div className="mt-4 text-sm text-muted-foreground">
        <p>Search for real-world locations like restaurants, hotels, or transit stations to add them to your collection map.</p>
        <p className="mt-2">Selected locations are saved immediately.</p>
      </div>
    </div>
  );
}

export function AddBuildingsToCollectionDialog({
  collectionId,
  existingBuildingIds,
  hiddenBuildingIds,
  open,
  onOpenChange,
}: AddBuildingsToCollectionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State merged from both branches
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const { data: buildings, isLoading } = useQuery({
    queryKey: ["add-buildings-dialog", user?.id, debouncedSearchQuery],
    queryFn: async () => {
      if (!user) return [];

      // Global search if query exists
      if (debouncedSearchQuery && debouncedSearchQuery.trim().length > 0) {
        const results = await searchBuildingsRpc({
            query_text: debouncedSearchQuery,
            p_limit: 50
        });

        // Map results to include proper image URLs
        return results.map((b) => ({
            ...b,
            main_image_url: b.main_image_url ? getBuildingImageUrl(b.main_image_url) : null,
        }));
      }

      const { data, error } = await supabase
        .from("user_buildings")
        .select(`
          building_id,
          status,
          rating,
          building:buildings (
            id,
            name,
            city,
            country,
            address,
            slug,
            hero_image_url,
            year_completed,
            building_architects(architect:architects(id, name))
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "ignored");

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildings = data.map((item: any) => ({
        ...item.building,
        rating: item.rating,
        main_image_url: item.building.hero_image_url ? getBuildingImageUrl(item.building.hero_image_url) : null,
        architects: item.building.building_architects?.map((ba: any) => ba.architect) || [],
        location_lat: 0,
        location_lng: 0,
        styles: [],
      }));

      // Identify buildings without images
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildingsWithoutImages = buildings.filter((b: any) => !b.main_image_url);
      const buildingIdsWithoutImages = buildingsWithoutImages.map((b: any) => b.id);

      if (buildingIdsWithoutImages.length > 0) {
        const { data: imagesData } = await supabase
          .from('review_images')
          .select('storage_path, user_buildings!inner(building_id)')
          .in('user_buildings.building_id', buildingIdsWithoutImages)
          .limit(50);

        if (imagesData) {
          const imageMap = new Map();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          imagesData.forEach((img: any) => {
            const bId = img.user_buildings.building_id;
            if (!imageMap.has(bId)) {
              imageMap.set(bId, img.storage_path);
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          buildings.forEach((b: any) => {
            if (!b.main_image_url && imageMap.has(b.id)) {
              b.main_image_url = getBuildingImageUrl(imageMap.get(b.id));
            }
          });
        }
      }

      return buildings as DiscoveryBuilding[];
    },
    enabled: !!user && open,
  });

  // Filtering logic merged from main (supports both search and location)
  const filteredBuildings = useMemo(() => {
    if (!buildings) return [];

    let result = buildings;

    if (hiddenBuildingIds && hiddenBuildingIds.size > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = result.filter((b: any) => !hiddenBuildingIds.has(b.id));
    }

    return result;
  }, [buildings, hiddenBuildingIds]);

  const hideMutation = useMutation({
      mutationFn: async (buildingId: string) => {
          const { error } = await supabase
              .from("collection_items")
              .insert({
                  collection_id: collectionId,
                  building_id: buildingId,
                  is_hidden: true
              });

          if (error) throw error;
      },
      onSuccess: () => {
          toast.success("Building hidden from suggestions");
          queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
      },
      onError: (error) => {
          console.error("Failed to hide building:", error);
          toast.error("Failed to hide building");
      }
  });

  const addMutation = useMutation({
    mutationFn: async (buildingId: string) => {
        // Get current max order_index
        const { data: maxOrderData, error: maxOrderError } = await supabase
            .from("collection_items")
            .select("order_index")
            .eq("collection_id", collectionId)
            .order("order_index", { ascending: false })
            .limit(1);

        if (maxOrderError) throw maxOrderError;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nextOrderIndex = ((maxOrderData?.[0] as any)?.order_index ?? -1) + 1;

        const { error } = await supabase
            .from("collection_items")
            .insert({
                collection_id: collectionId,
                building_id: buildingId,
                order_index: nextOrderIndex
            });

        if (error) throw error;
    },
    onSuccess: () => {
        toast.success("Building added to collection");
        queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
    },
    onError: (error) => {
        console.error("Failed to add building:", error);
        toast.error("Failed to add building");
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId || !buildings) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return buildings.find((b: any) => b.id === selectedBuildingId);
  }, [selectedBuildingId, buildings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 shrink-0 border-b">
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="architecture" className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
          <div className="px-4 border-b">
            <TabsList className="justify-start w-full h-12 p-0 bg-transparent rounded-none">
              <TabsTrigger
                value="architecture"
                className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Architecture
              </TabsTrigger>
              <TabsTrigger
                value="other-markers"
                className="relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Other Markers
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="architecture" className="flex flex-1 h-full min-h-0 m-0 mt-0 border-none p-0 data-[state=inactive]:hidden">
            {/* Left Column: List */}
            <div className="w-[350px] shrink-0 flex flex-col border-r">
              <div className="p-4 pb-2 border-b space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, city, country, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <DiscoveryList
                  buildings={filteredBuildings}
                  isLoading={isLoading}
                  className="p-2"
                  emptyState={
                    <p className="text-center text-muted-foreground py-8">
                      {searchQuery ? "No buildings found matching your search." : "No saved buildings found."}
                    </p>
                  }
                  onBuildingClick={(building) => setSelectedBuildingId(building.id)}
                  imagePosition="left"
                  renderAction={(building) => {
                    const isAdded = existingBuildingIds.has(building.id);
                    return (
                      <div className="flex items-center gap-1">
                        {!isAdded && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Hide suggestion"
                            disabled={hideMutation.isPending || addMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              hideMutation.mutate(building.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={isAdded ? "secondary" : "default"}
                          className="h-8 w-8 p-0 shrink-0 shadow-sm"
                          disabled={isAdded || addMutation.isPending || hideMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            addMutation.mutate(building.id);
                          }}
                        >
                          {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                    )
                  }}
                />
              </ScrollArea>
            </div>

            {/* Right Column: Details */}
            {selectedBuilding ? (
              <BuildingDetailPanel building={selectedBuilding} />
            ) : (
              <div className="flex-1 border-l hidden lg:flex items-center justify-center text-muted-foreground bg-muted/10">
                Select a building to view details
              </div>
            )}
          </TabsContent>

          <TabsContent value="other-markers" className="flex-1 p-0 m-0 mt-0 border-none data-[state=inactive]:hidden">
            {user && <OtherMarkersSearch collectionId={collectionId} userId={user.id} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
