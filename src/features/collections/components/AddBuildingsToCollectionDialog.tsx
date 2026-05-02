import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Plus,
  Check,
  Search,
  X,
  MapPin,
  PlusCircle,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { primaryBuildingCreditsToSummaries } from "@/features/credits/api/credits";
import { toast } from "sonner";
import { getBuildingImageUrl } from "@/utils/image";
import { BuildingDetailPanel } from "@/features/collections/components/BuildingDetailPanel";
import { DiscoveryList } from "@/features/search/components/DiscoveryList";
import { DiscoveryBuilding, type StyleSummary } from "@/features/search/components/types";
import { useDebounce } from "@/hooks/useDebounce";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import { parseLocation } from "@/utils/location";
import { config } from "@/config";
import { useAutocompleteSuggestions } from "@/hooks/useAutocompleteSuggestions";
import { fetchPlaceDetailsNew } from "@/lib/googleMapsGeocoding";
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
import type { CollectionMarker } from "@/features/collections/types";
import {
  getCollectionMarkerLucideIcon,
  mapGoogleTypesToCollectionCategory,
  pickGooglePrimaryTypeForStorage,
} from "@/features/collections/markerPlaceDisplay";

interface AddBuildingsToCollectionDialogProps {
  collectionId: string;
  existingBuildingIds: Set<string>;
  existingBuildings?: DiscoveryBuilding[];
  hiddenBuildingIds?: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parent refetch for the combined `collection_items` + `collection_markers` query (map + list). */
  onCollectionDataChanged?: () => void;
}

function displayMarkerSecondaryLine(marker: CollectionMarker): string | null {
  let displayAddress = marker.address;
  if (displayAddress && marker.name) {
    if (displayAddress.startsWith(`${marker.name}, `)) {
      displayAddress = displayAddress.substring(marker.name.length + 2);
    } else if (displayAddress.startsWith(`${marker.name},`)) {
      displayAddress = displayAddress.substring(marker.name.length + 1).trim();
    }
  }
  return displayAddress?.trim() || null;
}

function markerCategoryIcon(marker: CollectionMarker): LucideIcon {
  return getCollectionMarkerLucideIcon(marker.category, marker.google_primary_type);
}

/** Search field + suggestion list; mounts only after Google Places script is ready (see parent). */
function PlacesAutocompleteFields({
  collectionId,
  userId,
  markersCount,
  onCollectionDataChanged,
}: {
  collectionId: string;
  userId: string;
  markersCount: number;
  onCollectionDataChanged?: () => void;
}) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
    init,
  } = useAutocompleteSuggestions({
    debounce: 300,
    initOnMount: false,
    legacyAutocompleteFallback: false,
  });

  useEffect(() => {
    init();
  }, [init]);

  const queryClient = useQueryClient();

  const handleSelect = async (address: string, placeId: string, mainText: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const details = await fetchPlaceDetailsNew(placeId);
      const category = mapGoogleTypesToCollectionCategory(details.types);
      const googlePrimaryType = pickGooglePrimaryTypeForStorage(details.primaryType, details.types);
      const name = details.displayName?.trim() || mainText;

      const { error } = await supabase.from("collection_markers").insert({
        collection_id: collectionId,
        google_place_id: placeId,
        google_primary_type: googlePrimaryType,
        name,
        category,
        lat: details.lat,
        lng: details.lng,
        address: details.formattedAddress || address,
        created_by: userId,
      });

      if (error) throw error;

      toast.success("Place added to collection");
      setValue("", false);
      queryClient.invalidateQueries({ queryKey: ["collection_markers", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
      onCollectionDataChanged?.();
    } catch (_error) {
      toast.error("Failed to add place");
    }
  };

  const showIdleHint = status !== "OK" && status !== "ZERO_RESULTS" && status !== "ERROR" && markersCount === 0;

  return (
    <Command shouldFilter={false} className="flex flex-col bg-transparent shadow-none rounded-none border-0">
      <div className="shrink-0 px-4 pb-3 pt-1">
        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary z-10 pointer-events-none" />
          <CommandPrimitive.Input
            value={value}
            onValueChange={(val) => {
              setValue(val);
            }}
            disabled={!ready}
            placeholder="Search for a place to add…"
            autoComplete="off"
            className={cn(
              "flex h-10 w-full rounded-sm border-0 bg-brand-secondary pl-9 pr-3 py-2 text-sm shadow-none outline-none ring-0",
              "placeholder:text-text-secondary focus-visible:ring-1 focus-visible:ring-brand-primary focus-visible:ring-offset-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        {status === "OK" || status === "ZERO_RESULTS" ? (
          <CommandList className="max-h-none overflow-visible p-0">
            {status === "OK" && data.length > 0 ? (
              <CommandGroup heading="Suggestions" className="[&_[cmdk-group-heading]]:px-0 [&_[cmdk-group-heading]]:pb-2">
                {data.map(({ place_id, description, structured_formatting }) => (
                  <CommandItem
                    key={place_id}
                    value={description}
                    onSelect={() =>
                      handleSelect(description, place_id, structured_formatting?.main_text || description)
                    }
                    className="cursor-pointer rounded-none px-2 aria-selected:bg-brand-secondary"
                  >
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-text-secondary" />
                    <span className="text-sm">{description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {status === "ZERO_RESULTS" && <CommandEmpty className="py-6 text-sm">No results found.</CommandEmpty>}
          </CommandList>
        ) : status === "ERROR" ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Could not load suggestions. Confirm Places is enabled for this project&apos;s API key.
          </p>
        ) : showIdleHint ? (
          <p className="py-4 text-center text-sm leading-relaxed text-text-secondary">
            Search above to add restaurants, hotels, transit stops, and other places. New picks appear on your map straight away.
          </p>
        ) : null}
      </div>
    </Command>
  );
}

function OtherMarkersTabPanel({
  collectionId,
  userId,
  dialogOpen,
  onCollectionDataChanged,
}: {
  collectionId: string;
  userId: string;
  dialogOpen: boolean;
  onCollectionDataChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      if (window.google?.maps?.places) {
        setScriptLoaded(true);
        return;
      }

      const apiKey = config.googleMaps.apiKey;
      if (!apiKey) {
        setHasError(true);
        return;
      }

      try {
        setOptions({
          key: apiKey,
          v: "weekly",
        });

        await importLibrary("places");

        setScriptLoaded(true);
      } catch (_error) {
        setHasError(true);
      }
    };

    initMap();
  }, []);

  const { data: markers = [], isLoading: markersLoading } = useQuery({
    queryKey: ["collection_markers", collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_markers")
        .select("*")
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CollectionMarker[];
    },
    enabled: !!collectionId && dialogOpen,
  });

  const removeMarkerMutation = useMutation({
    mutationFn: async (markerId: string) => {
      const { error } = await supabase.from("collection_markers").delete().eq("id", markerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Place removed from collection");
      queryClient.invalidateQueries({ queryKey: ["collection_markers", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
      onCollectionDataChanged?.();
    },
    onError: () => {
      toast.error("Could not remove place");
    },
  });

  const handleRemoveMarker = (markerId: string) => {
    setRemovingId(markerId);
    removeMarkerMutation.mutate(markerId, {
      onSettled: () => setRemovingId(null),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {hasError ? (
        <div className="flex flex-1 flex-col justify-center px-4 pb-8 text-center text-sm text-feedback-destructive">
          Could not load Google Places. Try again later.
        </div>
      ) : !scriptLoaded ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-text-secondary">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-xs">Loading place search…</p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col pb-4">
            <PlacesAutocompleteFields
              collectionId={collectionId}
              userId={userId}
              markersCount={markers.length}
              onCollectionDataChanged={onCollectionDataChanged}
            />
            <div className="px-4 pt-4">
              {markersLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-11 rounded-sm bg-brand-secondary/80 animate-pulse" />
                  ))}
                </div>
              ) : markers.length > 0 ? (
                <>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Places on this map
                  </p>
                  <ul className="space-y-0.5">
                    {markers.map((marker) => {
                      const Icon = markerCategoryIcon(marker);
                      const line2 = displayMarkerSecondaryLine(marker);
                      const busy = removingId === marker.id;
                      return (
                        <li key={marker.id}>
                          <div className="flex items-start gap-2 rounded-sm px-2 py-2 transition-colors hover:bg-brand-secondary/60">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug text-text-primary">{marker.name}</p>
                              {line2 ? (
                                <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{line2}</p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-text-secondary hover:text-text-primary"
                              disabled={busy}
                              onClick={() => handleRemoveMarker(marker.id)}
                              title="Remove from collection"
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface UserBuildingResponse {
  building_id: string;
  status: string;
  rating: number | null;
  building: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    address: string | null;
    slug: string | null;
    location: unknown | null;
    hero_image_url: string | null;
    community_preview_url: string | null;
    year_completed: number | null;
    building_credits: {
      credit_tier: string | null;
      status: string | null;
      person: { id: string; name: string } | null;
      company: { id: string; name: string } | null;
    }[];
  } | null;
}

export function AddBuildingsToCollectionDialog({
  collectionId,
  existingBuildingIds,
  existingBuildings,
  hiddenBuildingIds,
  open,
  onOpenChange,
  onCollectionDataChanged,
}: AddBuildingsToCollectionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
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
        const results: DiscoveryBuilding[] = await searchBuildingsRpc({
          query_text: debouncedSearchQuery,
          p_limit: 50,
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
            location,
            hero_image_url,
            community_preview_url,
            year_completed,
            building_credits(
              credit_tier,
              status,
              person:people(id, name),
              company:companies(id, name)
            )
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "ignored");

      if (error) throw error;

      const buildings: DiscoveryBuilding[] = (data as UserBuildingResponse[])
        .filter(item => item.building) // Ensure building exists
        .map((item) => {
          const b = item.building!;
          const location = parseLocation(b.location);
          return {
            ...b,
            rating: item.rating,
            main_image_url: (b.hero_image_url || b.community_preview_url)
              ? getBuildingImageUrl(b.hero_image_url || b.community_preview_url)
              : null,
            credits: primaryBuildingCreditsToSummaries(b.building_credits ?? []),
            location_lat: location?.lat || 0,
            location_lng: location?.lng || 0,
            styles: [] as StyleSummary[],
          };
      });

      // Identify buildings without images
      const buildingsWithoutImages = buildings.filter((b) => !b.main_image_url);
      const buildingIdsWithoutImages = buildingsWithoutImages.map((b) => b.id);

      if (buildingIdsWithoutImages.length > 0) {
        const { data: imagesData } = await supabase
          .from('review_images')
          .select('storage_path, building_posts!review_images_review_id_fkey!inner(building_id)')
          .in('building_posts.building_id', buildingIdsWithoutImages)
          .limit(50);

        if (imagesData) {
          const imageMap = new Map();
          imagesData.forEach((img: { storage_path: string; building_posts: { building_id: string } | { building_id: string }[] | null }) => {
            if (!img.building_posts) return;
            const bId = Array.isArray(img.building_posts) ? img.building_posts[0]?.building_id : img.building_posts.building_id;

            if (bId && !imageMap.has(bId)) {
              imageMap.set(bId, img.storage_path);
            }
          });

          buildings.forEach((b) => {
            if (!b.main_image_url && imageMap.has(b.id)) {
              b.main_image_url = getBuildingImageUrl(imageMap.get(b.id));
            }
          });
        }
      }

      return buildings as unknown as DiscoveryBuilding[];
    },
    enabled: !!user && open,
  });

  // Filtering logic merged from main (supports both search and location)
  const filteredBuildings = useMemo(() => {
    if (!buildings) return [];

    // Create a copy to sort
    let result = [...buildings];

    if (hiddenBuildingIds && hiddenBuildingIds.size > 0) {
        result = result.filter((b) => !hiddenBuildingIds.has(b.id));
    }

    // Sort by distance if no search query and existing buildings are present
    if (!debouncedSearchQuery && existingBuildings && existingBuildings.length > 0) {
      const validExisting = existingBuildings.filter(b => b.location_lat !== 0 || b.location_lng !== 0);

      if (validExisting.length > 0) {
        const sum = validExisting.reduce(
          (acc, b) => ({ lat: acc.lat + b.location_lat, lng: acc.lng + b.location_lng }),
          { lat: 0, lng: 0 }
        );
        const centroid = { lat: sum.lat / validExisting.length, lng: sum.lng / validExisting.length };

        result.sort((a, b) => {
            // Push items with invalid location to the end
            if ((a.location_lat === 0 && a.location_lng === 0)) return 1;
            if ((b.location_lat === 0 && b.location_lng === 0)) return -1;

            const distA = Math.pow(a.location_lat - centroid.lat, 2) + Math.pow(a.location_lng - centroid.lng, 2);
            const distB = Math.pow(b.location_lat - centroid.lat, 2) + Math.pow(b.location_lng - centroid.lng, 2);
            return distA - distB;
        });
      }
    }

    return result;
  }, [buildings, hiddenBuildingIds, existingBuildings, debouncedSearchQuery]);

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
          onCollectionDataChanged?.();
      },
      onError: (_error) => {
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

        const currentMax = maxOrderData?.[0]?.order_index ?? -1;
        const nextOrderIndex = currentMax + 1;

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
        onCollectionDataChanged?.();
    },
    onError: (_error) => {
toast.error("Failed to add building");
    }
  });

  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId || !buildings) return null;
    return buildings.find((b) => b.id === selectedBuildingId);
  }, [selectedBuildingId, buildings]);

  const searchFooter = searchQuery ? (
    <div className="flex flex-col items-center justify-center pt-8 pb-2 gap-4 mt-2">
      <p className="text-center text-sm text-text-secondary">
        Not finding what you are looking for?
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/add-building?name=${encodeURIComponent(searchQuery)}`)}
        className="gap-2"
      >
        <PlusCircle className="h-4 w-4" />
        Create new building
      </Button>
    </div>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col gap-0 overflow-hidden border-0 bg-surface-overlay p-0 shadow-xl rounded-lg">
        <DialogHeader className="shrink-0 px-5 pb-2 pt-5">
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="architecture" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 px-5">
            <TabsList className="h-11 w-full justify-start gap-6 rounded-none border-0 bg-transparent p-0 shadow-none ring-0">
              <TabsTrigger
                value="architecture"
                className="relative h-11 rounded-none border-0 border-b-2 border-b-transparent bg-transparent px-0 pb-2 pt-1 text-sm font-semibold text-text-secondary shadow-none ring-0 transition-none data-[state=active]:border-b-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
              >
                Architecture
              </TabsTrigger>
              <TabsTrigger
                value="other-markers"
                className="relative h-11 rounded-none border-0 border-b-2 border-b-transparent bg-transparent px-0 pb-2 pt-1 text-sm font-semibold text-text-secondary shadow-none ring-0 transition-none data-[state=active]:border-b-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
              >
                Other markers
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="architecture" className="m-0 mt-0 flex min-h-0 flex-1 border-none p-0 data-[state=inactive]:hidden">
            <div className="flex min-h-0 flex-1 divide-x divide-border-default">
            {/* Left Column: List */}
            <div className="flex w-[350px] shrink-0 flex-col min-h-0">
              <div className="space-y-2 px-4 pb-3 pt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-secondary" />
                  <Input
                    placeholder="Search by name, city, country, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 bg-brand-secondary pl-9 shadow-none ring-0 focus-visible:border-0 focus-visible:ring-1 focus-visible:ring-brand-primary focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <DiscoveryList
                  buildings={filteredBuildings}
                  isLoading={isLoading}
                  variant="compact"
                  className="p-2"
                  emptyState={
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                      <p className="text-center text-text-secondary">
                        {searchQuery ? "No buildings found matching your search." : "No saved buildings found."}
                      </p>
                      {searchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/add-building?name=${encodeURIComponent(searchQuery)}`)}
                          className="gap-2"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Create new building
                        </Button>
                      )}
                    </div>
                  }
                  onBuildingClick={(building) => setSelectedBuildingId(building.id)}
                  imagePosition="left"
                  footer={searchFooter}
                  renderAction={(building) => {
                    const isAdded = existingBuildingIds.has(building.id);
                    return (
                      <div className="flex items-center gap-1">
                        {!isAdded && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 shrink-0 text-text-secondary hover:text-text-primary hover:bg-surface-muted"
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
              <BuildingDetailPanel
                building={{
                  ...selectedBuilding,
                  slug: selectedBuilding.slug ?? selectedBuilding.id,
                  hero_image_url:
                    selectedBuilding.main_image_url
                    ?? selectedBuilding.hero_image_url
                    ?? selectedBuilding.community_preview_url
                    ?? null,
                }}
              />
            ) : (
              <div className="hidden min-h-0 flex-1 flex-col items-center justify-center bg-surface-muted/15 px-6 text-center text-sm text-text-secondary lg:flex">
                Select a building to view details
              </div>
            )}
            </div>
          </TabsContent>

          <TabsContent
            value="other-markers"
            className="m-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden border-none p-0 data-[state=inactive]:hidden"
          >
            {user && (
              <OtherMarkersTabPanel
                collectionId={collectionId}
                userId={user.id}
                dialogOpen={open}
                onCollectionDataChanged={onCollectionDataChanged}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
