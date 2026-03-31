import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng, } from "use-places-autocomplete";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { config } from "@/config";
import { Command, CommandGroup, CommandItem, CommandList, } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
export function DiscoverySearchInput({ value, onSearchChange, onLocationSelect, placeholder = "Search...", className, onKeyDown, onTopLocationChange, disableDropdown = false, onSuggestionsChange, onPlaceDetails, }) {
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const commandRef = useRef(null);
    const [open, setOpen] = useState(false);
    // Load Google Maps Script
    useEffect(() => {
        const initMap = async () => {
            if (window.google?.maps?.places) {
                setScriptLoaded(true);
                return;
            }
            const apiKey = config.googleMaps.apiKey;
            if (!apiKey) {
                return;
            }
            try {
                setOptions({ key: apiKey, v: "weekly" });
                // Add timeout to prevent hanging indefinitely
                await Promise.race([
                    Promise.all([importLibrary("places"), importLibrary("geocoding")]),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Google Maps load timeout")), 10000))
                ]);
                setScriptLoaded(true);
            }
            catch {
            }
        };
        initMap();
    }, []);
    const { ready, value: placesValue, setValue: setPlacesValue, suggestions: { status, data }, clearSuggestions, init, } = usePlacesAutocomplete({
        requestOptions: {
            types: ["(regions)"],
        },
        debounce: 300,
        initOnMount: false,
    });
    // Initialize places autocomplete when script is loaded
    useEffect(() => {
        if (scriptLoaded) {
            init();
        }
    }, [scriptLoaded, init]);
    // Re-trigger search when ready becomes true
    useEffect(() => {
        if (ready && value) {
            setPlacesValue(value);
        }
    }, [ready, value, setPlacesValue]);
    // Update suggestions and top location
    useEffect(() => {
        if (status === "OK") {
            const suggestions = data.map(d => ({ place_id: d.place_id, description: d.description }));
            onSuggestionsChange?.(suggestions);
            if (data.length > 0) {
                onTopLocationChange?.({
                    description: data[0].description,
                    place_id: data[0].place_id,
                });
            }
            else {
                onTopLocationChange?.(null);
            }
        }
        else {
            onSuggestionsChange?.([]);
            onTopLocationChange?.(null);
        }
    }, [data, status, onTopLocationChange, onSuggestionsChange]);
    // Sync external value with internal places value to ensure suggestions are relevant
    useEffect(() => {
        if (value !== placesValue) {
            setPlacesValue(value);
        }
    }, [value, setPlacesValue, placesValue]);
    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (commandRef.current && !commandRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const handleSelect = async (address) => {
        clearSuggestions();
        setOpen(false);
        // Clear search query to show all buildings in the new location
        onSearchChange("");
        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            let bounds;
            const viewport = results[0].geometry.viewport;
            if (viewport && typeof viewport.getNorthEast === 'function') {
                bounds = {
                    north: viewport.getNorthEast().lat(),
                    south: viewport.getSouthWest().lat(),
                    east: viewport.getNorthEast().lng(),
                    west: viewport.getSouthWest().lng()
                };
            }
            onLocationSelect({ lat, lng }, bounds);
            onPlaceDetails?.(results[0]);
        }
        catch {
        }
    };
    if (!scriptLoaded) {
        return (_jsx(Input, { value: value, onChange: (e) => onSearchChange(e.target.value), placeholder: placeholder, className: cn("h-12", className) }));
    }
    return (_jsx("div", { className: cn("relative", className), ref: commandRef, children: _jsxs(Command, { shouldFilter: false, className: "overflow-visible bg-transparent", children: [_jsx("div", { className: "relative", children: _jsx(Input, { value: value, onChange: (e) => {
                            const val = e.target.value;
                            onSearchChange(val);
                            setPlacesValue(val);
                            setOpen(!!val);
                        }, onFocus: () => setOpen(!!value), placeholder: placeholder, className: "w-full h-12", autoComplete: "off", onKeyDown: onKeyDown }) }), !disableDropdown && open && status === "OK" && (_jsx("div", { className: "absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-sm border border-border-default bg-surface-overlay text-text-primary shadow-lg outline-none animate-in fade-in-0 zoom-in-95", children: _jsx(CommandList, { children: _jsx(CommandGroup, { heading: "Locations", children: data.map(({ place_id, description }) => (_jsxs(CommandItem, { value: description, onSelect: () => handleSelect(description), className: "cursor-pointer hover:bg-brand-secondary", children: [_jsx(MapPin, { className: "mr-2 h-4 w-4 shrink-0 text-text-secondary" }), _jsx("span", { children: description })] }, place_id))) }) }) }))] }) }));
}
