import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng, } from "use-places-autocomplete";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { config } from "@/config";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator, } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { MapPin, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { useMapContext } from "@/features/maps/providers/MapContext";
export function OmniSearchBar({ placeholder = "Search places or buildings...", className, }) {
    const { methods } = useMapContext();
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const commandRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const debouncedInput = useDebounce(inputValue, 300);
    // Load Google Maps Script
    useEffect(() => {
        const initMap = async () => {
            if (window.google?.maps?.places) {
                setScriptLoaded(true);
                return;
            }
            const apiKey = config.googleMaps.apiKey;
            if (!apiKey)
                return;
            try {
                setOptions({ key: apiKey, v: "weekly" });
                await importLibrary("places");
                await importLibrary("geocoding");
                setScriptLoaded(true);
            }
            catch {
            }
        };
        initMap();
    }, []);
    // Places Autocomplete
    const { ready: _ready, value: _placesValue, setValue: setPlacesValue, suggestions: { status: placesStatus, data: placesData }, clearSuggestions, } = usePlacesAutocomplete({
        requestOptions: {
            types: ["(regions)"],
        },
        debounce: 300,
        initOnMount: true,
    });
    // Buildings Query
    const { data: buildingsData, isLoading: isBuildingsLoading } = useQuery({
        queryKey: ["search-buildings", debouncedInput],
        queryFn: async () => {
            if (!debouncedInput || debouncedInput.length < 2)
                return [];
            const { data, error } = await supabase.rpc("search_buildings", {
                query_text: debouncedInput,
            });
            if (error)
                throw error;
            return data;
        },
        enabled: debouncedInput.length >= 2,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
    // Sync input value with places
    useEffect(() => {
        setPlacesValue(inputValue);
    }, [inputValue, setPlacesValue]);
    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (commandRef.current &&
                !commandRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const handlePlaceSelect = async (address) => {
        clearSuggestions();
        setOpen(false);
        setInputValue(""); // Clear input
        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            methods.moveMap(lat, lng, 12);
        }
        catch {
        }
    };
    const handleBuildingSelect = (building) => {
        setOpen(false);
        setInputValue(""); // Clear input
        // Update filter
        methods.setFilter("query", building.name);
        // Optional: Move map if location available
        if (building.location_lat && building.location_lng) {
            methods.moveMap(building.location_lat, building.location_lng, 16);
        }
    };
    if (!scriptLoaded) {
        return (_jsx(Input, { value: inputValue, onChange: (e) => setInputValue(e.target.value), placeholder: placeholder, className: className }));
    }
    const hasPlaces = placesStatus === "OK" && placesData.length > 0;
    const hasBuildings = buildingsData && buildingsData.length > 0;
    const showDropdown = open && (hasPlaces || hasBuildings || isBuildingsLoading);
    return (_jsx("div", { className: cn("relative", className), ref: commandRef, children: _jsxs(Command, { shouldFilter: false, className: "overflow-visible bg-transparent", children: [_jsxs("div", { className: "relative", children: [_jsx(Input, { value: inputValue, onChange: (e) => {
                                setInputValue(e.target.value);
                                setOpen(!!e.target.value);
                            }, onFocus: () => setOpen(!!inputValue), placeholder: placeholder, className: "w-full pr-10", autoComplete: "off" }), isBuildingsLoading && (_jsx("div", { className: "absolute right-3 top-1/2 -translate-y-1/2", children: _jsx(Loader2, { className: "h-4 w-4 animate-spin text-text-secondary" }) }))] }), showDropdown && (_jsx("div", { className: "absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-sm border border-border-default bg-surface-overlay text-text-primary shadow-lg outline-none animate-in fade-in-0 zoom-in-95 max-h-[400px] overflow-y-auto", children: _jsxs(CommandList, { children: [hasPlaces && (_jsx(CommandGroup, { heading: "Places", children: placesData.slice(0, 2).map(({ place_id, description }) => (_jsxs(CommandItem, { value: description, onSelect: () => handlePlaceSelect(description), className: "cursor-pointer hover:bg-brand-secondary", children: [_jsx(MapPin, { className: "mr-2 h-4 w-4 shrink-0 text-text-secondary" }), _jsx("span", { children: description })] }, place_id))) })), hasPlaces && hasBuildings && _jsx(CommandSeparator, {}), hasBuildings && (_jsx(CommandGroup, { heading: "Buildings", children: buildingsData.map((building) => (_jsxs(CommandItem, { value: building.name, onSelect: () => handleBuildingSelect(building), className: "cursor-pointer hover:bg-brand-secondary", children: [_jsx(Building2, { className: "mr-2 h-4 w-4 shrink-0 text-text-secondary" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { children: building.name }), building.city && (_jsxs("span", { className: "text-xs text-text-secondary", children: [building.city, building.country ? `, ${building.country}` : ""] }))] })] }, building.id))) }))] }) }))] }) }));
}
