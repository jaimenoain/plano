import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Check, Search, X, MapPin, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";
import { getBuildingImageUrl } from "@/utils/image";
import { BuildingDetailPanel } from "@/features/collections/components/BuildingDetailPanel";
import { DiscoveryList } from "@/features/search/components/DiscoveryList";
import { useDebounce } from "@/hooks/useDebounce";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import { parseLocation } from "@/utils/location";
import { config } from "@/config";
import usePlacesAutocomplete, { getGeocode, getLatLng, } from "use-places-autocomplete";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty, } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
const mapGoogleTypeToCategory = (types = []) => {
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
function OtherMarkersSearch({ collectionId, userId }) {
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
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
                });
                await importLibrary("places");
                await importLibrary("geocoding");
                setScriptLoaded(true);
            }
            catch (_error) {
                setHasError(true);
            }
        };
        initMap();
    }, []);
    if (hasError) {
        return (_jsx("div", { className: "p-4 text-center text-red-500", children: "Error loading Google Maps. Please try again later." }));
    }
    if (!scriptLoaded) {
        return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) }));
    }
    return _jsx(PlacesAutocomplete, { collectionId: collectionId, userId: userId });
}
function PlacesAutocomplete({ collectionId, userId }) {
    const { ready, value, setValue, suggestions: { status, data }, clearSuggestions, } = usePlacesAutocomplete({
        debounce: 300,
        initOnMount: true,
    });
    const queryClient = useQueryClient();
    const handleSelect = async (address, placeId, mainText) => {
        setValue(address, false);
        clearSuggestions();
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
            if (error)
                throw error;
            toast.success("Marker added to collection");
            setValue("", false); // Clear input after successful add
            queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
        }
        catch (_error) {
            toast.error("Failed to add marker");
        }
    };
    return (_jsxs(Command, { shouldFilter: false, className: "h-full flex flex-col overflow-hidden bg-transparent", children: [_jsx("div", { className: "p-4 border-b shrink-0", children: _jsxs("div", { className: "relative", children: [_jsx(MapPin, { className: "absolute left-3 top-3 h-4 w-4 text-text-secondary z-10" }), _jsx(CommandPrimitive.Input, { value: value, onValueChange: (val) => {
                                setValue(val);
                            }, disabled: !ready, placeholder: "Search for a place (e.g. 'Central Station')...", autoComplete: "off", className: cn("flex h-10 w-full rounded-md border-none bg-transparent pl-9 pr-3 py-2 text-sm outline-none placeholder:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50") })] }) }), _jsx("div", { className: "flex-1 overflow-y-auto", children: (status === "OK" || status === "ZERO_RESULTS") ? (_jsxs(CommandList, { className: "max-h-full overflow-visible p-2", children: [_jsx(CommandGroup, { heading: "Suggestions", children: status === "OK" &&
                                data.map(({ place_id, description, structured_formatting }) => (_jsxs(CommandItem, { value: description, onSelect: () => handleSelect(description, place_id, structured_formatting?.main_text || description), className: "cursor-pointer", children: [_jsx(MapPin, { className: "mr-2 h-4 w-4 shrink-0" }), _jsx("span", { children: description })] }, place_id))) }), status === "ZERO_RESULTS" && (_jsx(CommandEmpty, { children: "No results found." }))] })) : (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-secondary p-8 text-center", children: [_jsx("p", { children: "Search for real-world locations like restaurants, hotels, or transit stations to add them to your collection map." }), _jsx("p", { className: "mt-2", children: "Selected locations are saved immediately." })] })) })] }));
}
export function AddBuildingsToCollectionDialog({ collectionId, existingBuildingIds, existingBuildings, hiddenBuildingIds, open, onOpenChange, }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    // State merged from both branches
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [selectedBuildingId, setSelectedBuildingId] = useState(null);
    const { data: buildings, isLoading } = useQuery({
        queryKey: ["add-buildings-dialog", user?.id, debouncedSearchQuery],
        queryFn: async () => {
            if (!user)
                return [];
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
            location,
            hero_image_url,
            year_completed,
            building_architects(architect:architects(id, name))
          )
        `)
                .eq("user_id", user.id)
                .neq("status", "ignored")
                .returns();
            if (error)
                throw error;
            const buildings = data
                .filter(item => item.building) // Ensure building exists
                .map((item) => {
                const b = item.building;
                const location = parseLocation(b.location);
                return {
                    ...b,
                    rating: item.rating,
                    main_image_url: b.hero_image_url ? getBuildingImageUrl(b.hero_image_url) : null,
                    architects: b.building_architects?.map((ba) => ba.architect).filter(Boolean) || [],
                    location_lat: location?.lat || 0,
                    location_lng: location?.lng || 0,
                    styles: [],
                };
            });
            // Identify buildings without images
            const buildingsWithoutImages = buildings.filter((b) => !b.main_image_url);
            const buildingIdsWithoutImages = buildingsWithoutImages.map((b) => b.id);
            if (buildingIdsWithoutImages.length > 0) {
                const { data: imagesData } = await supabase
                    .from('review_images')
                    .select('storage_path, user_buildings!inner(building_id)')
                    .in('user_buildings.building_id', buildingIdsWithoutImages)
                    .limit(50);
                if (imagesData) {
                    const imageMap = new Map();
                    imagesData.forEach((img) => {
                        if (!img.user_buildings)
                            return;
                        // Handle array or object case for joined relationship (though !inner typically returns object if 1:1 or N:1)
                        // But supabase-js types can be tricky. Here we know it's a join on review_images (N) -> user_buildings (1).
                        // So img.user_buildings should be an object.
                        const bId = Array.isArray(img.user_buildings) ? img.user_buildings[0]?.building_id : img.user_buildings.building_id;
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
            return buildings;
        },
        enabled: !!user && open,
    });
    // Filtering logic merged from main (supports both search and location)
    const filteredBuildings = useMemo(() => {
        if (!buildings)
            return [];
        // Create a copy to sort
        let result = [...buildings];
        if (hiddenBuildingIds && hiddenBuildingIds.size > 0) {
            result = result.filter((b) => !hiddenBuildingIds.has(b.id));
        }
        // Sort by distance if no search query and existing buildings are present
        if (!debouncedSearchQuery && existingBuildings && existingBuildings.length > 0) {
            const validExisting = existingBuildings.filter(b => b.location_lat !== 0 || b.location_lng !== 0);
            if (validExisting.length > 0) {
                const sum = validExisting.reduce((acc, b) => ({ lat: acc.lat + b.location_lat, lng: acc.lng + b.location_lng }), { lat: 0, lng: 0 });
                const centroid = { lat: sum.lat / validExisting.length, lng: sum.lng / validExisting.length };
                result.sort((a, b) => {
                    // Push items with invalid location to the end
                    if ((a.location_lat === 0 && a.location_lng === 0))
                        return 1;
                    if ((b.location_lat === 0 && b.location_lng === 0))
                        return -1;
                    const distA = Math.pow(a.location_lat - centroid.lat, 2) + Math.pow(a.location_lng - centroid.lng, 2);
                    const distB = Math.pow(b.location_lat - centroid.lat, 2) + Math.pow(b.location_lng - centroid.lng, 2);
                    return distA - distB;
                });
            }
        }
        return result;
    }, [buildings, hiddenBuildingIds, existingBuildings, debouncedSearchQuery]);
    const hideMutation = useMutation({
        mutationFn: async (buildingId) => {
            const { error } = await supabase
                .from("collection_items")
                .insert({
                collection_id: collectionId,
                building_id: buildingId,
                is_hidden: true
            });
            if (error)
                throw error;
        },
        onSuccess: () => {
            toast.success("Building hidden from suggestions");
            queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
        },
        onError: (_error) => {
            toast.error("Failed to hide building");
        }
    });
    const addMutation = useMutation({
        mutationFn: async (buildingId) => {
            // Get current max order_index
            const { data: maxOrderData, error: maxOrderError } = await supabase
                .from("collection_items")
                .select("order_index")
                .eq("collection_id", collectionId)
                .order("order_index", { ascending: false })
                .limit(1);
            if (maxOrderError)
                throw maxOrderError;
            const currentMax = maxOrderData?.[0]?.order_index ?? -1;
            const nextOrderIndex = currentMax + 1;
            const { error } = await supabase
                .from("collection_items")
                .insert({
                collection_id: collectionId,
                building_id: buildingId,
                order_index: nextOrderIndex
            });
            if (error)
                throw error;
        },
        onSuccess: () => {
            toast.success("Building added to collection");
            queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
        },
        onError: (_error) => {
            toast.error("Failed to add building");
        }
    });
    const selectedBuilding = useMemo(() => {
        if (!selectedBuildingId || !buildings)
            return null;
        return buildings.find((b) => b.id === selectedBuildingId);
    }, [selectedBuildingId, buildings]);
    const searchFooter = searchQuery ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 gap-4 border-t mt-4", children: [_jsx("p", { className: "text-center text-text-secondary", children: "Not finding what you are looking for?" }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate(`/add-building?name=${encodeURIComponent(searchQuery)}`), className: "gap-2", children: [_jsx(PlusCircle, { className: "h-4 w-4" }), "Create new building"] })] })) : null;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-5xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden", children: [_jsx(DialogHeader, { className: "p-4 pb-2 shrink-0 border-b", children: _jsx(DialogTitle, { children: "Add to Collection" }) }), _jsxs(Tabs, { defaultValue: "architecture", className: "flex flex-col flex-1 h-full min-h-0 overflow-hidden", children: [_jsx("div", { className: "px-4 border-b", children: _jsxs(TabsList, { className: "justify-start w-full h-12 p-0 bg-transparent rounded-none", children: [_jsx(TabsTrigger, { value: "architecture", className: "relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-text-secondary shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none", children: "Architecture" }), _jsx(TabsTrigger, { value: "other-markers", className: "relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-text-secondary shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none", children: "Other Markers" })] }) }), _jsxs(TabsContent, { value: "architecture", className: "flex flex-1 h-full min-h-0 m-0 mt-0 border-none p-0 data-[state=inactive]:hidden", children: [_jsxs("div", { className: "w-[350px] shrink-0 flex flex-col border-r", children: [_jsx("div", { className: "p-4 pb-2 border-b space-y-2", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" }), _jsx(Input, { placeholder: "Search by name, city, country, or address...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "pl-9" })] }) }), _jsx(ScrollArea, { className: "flex-1", children: _jsx(DiscoveryList, { buildings: filteredBuildings, isLoading: isLoading, className: "p-2", emptyState: _jsxs("div", { className: "flex flex-col items-center justify-center py-8 gap-4", children: [_jsx("p", { className: "text-center text-text-secondary", children: searchQuery ? "No buildings found matching your search." : "No saved buildings found." }), searchQuery && (_jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate(`/add-building?name=${encodeURIComponent(searchQuery)}`), className: "gap-2", children: [_jsx(PlusCircle, { className: "h-4 w-4" }), "Create new building"] }))] }), onBuildingClick: (building) => setSelectedBuildingId(building.id), imagePosition: "left", footer: searchFooter, renderAction: (building) => {
                                                    const isAdded = existingBuildingIds.has(building.id);
                                                    return (_jsxs("div", { className: "flex items-center gap-1", children: [!isAdded && (_jsx(Button, { size: "sm", variant: "ghost", className: "h-8 w-8 p-0 shrink-0 text-text-secondary hover:text-text-primary hover:bg-surface-muted", title: "Hide suggestion", disabled: hideMutation.isPending || addMutation.isPending, onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    hideMutation.mutate(building.id);
                                                                }, children: _jsx(X, { className: "h-4 w-4" }) })), _jsx(Button, { size: "sm", variant: isAdded ? "secondary" : "default", className: "h-8 w-8 p-0 shrink-0 shadow-sm", disabled: isAdded || addMutation.isPending || hideMutation.isPending, onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    addMutation.mutate(building.id);
                                                                }, children: isAdded ? _jsx(Check, { className: "h-4 w-4" }) : _jsx(Plus, { className: "h-4 w-4" }) })] }));
                                                } }) })] }), selectedBuilding ? (_jsx(BuildingDetailPanel, { building: {
                                        ...selectedBuilding,
                                        slug: selectedBuilding.slug ?? selectedBuilding.id,
                                        hero_image_url: selectedBuilding.main_image_url ?? null,
                                    } })) : (_jsx("div", { className: "flex-1 border-l hidden lg:flex items-center justify-center text-text-secondary bg-surface-muted/10", children: "Select a building to view details" }))] }), _jsx(TabsContent, { value: "other-markers", className: "flex-1 p-0 m-0 mt-0 border-none data-[state=inactive]:hidden", children: user && _jsx(OtherMarkersSearch, { collectionId: collectionId, userId: user.id }) })] })] }) }));
}
