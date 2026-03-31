import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete, { getGeocode, } from "use-places-autocomplete";
// CHANGED: Import new functional API instead of the removed Loader class
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { config } from "@/config";
import { Command as CommandPrimitive } from "cmdk";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty, } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
export function LocationInput({ value, onLocationSelected, className, placeholder = "Search for a city...", searchTypes = ["(cities)"], id, }) {
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    // Load Google Maps Script
    useEffect(() => {
        const initMap = async () => {
            // Check if already loaded globally
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
                // FIXED: Use new functional API
                setOptions({
                    key: apiKey,
                    v: "weekly",
                });
                // Explicitly load the places library
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
        return (_jsx(Input, { id: id, value: value, onChange: (e) => onLocationSelected(e.target.value, ""), placeholder: placeholder, className: className }));
    }
    return (_jsx("div", { className: className, children: scriptLoaded ? (_jsx(PlacesAutocomplete, { defaultValue: value, onLocationSelected: onLocationSelected, placeholder: placeholder, searchTypes: searchTypes, id: id })) : (_jsxs(Button, { variant: "outline", disabled: true, className: "w-full justify-start", children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Loading Maps..."] })) }));
}
function PlacesAutocomplete({ defaultValue, onLocationSelected, placeholder, searchTypes, id, }) {
    const { ready, value, setValue, suggestions: { status, data }, clearSuggestions, } = usePlacesAutocomplete({
        requestOptions: {
            // If searchTypes is empty, pass undefined to search all types
            types: searchTypes && searchTypes.length > 0 ? searchTypes : undefined,
        },
        defaultValue,
        debounce: 300,
        initOnMount: true,
    });
    const [open, setOpen] = useState(false);
    const commandRef = useRef(null);
    // Sync internal value with external defaultValue updates
    useEffect(() => {
        if (defaultValue !== undefined && defaultValue !== value) {
            setValue(defaultValue, false);
        }
    }, [defaultValue, setValue, value]);
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
    const handleSelect = async (address, placeName) => {
        setValue(address, false);
        clearSuggestions();
        setOpen(false);
        try {
            const results = await getGeocode({ address });
            const addressComponents = results[0]?.address_components;
            const countryComponent = addressComponents?.find((c) => c.types.includes("country"));
            const countryCode = countryComponent ? countryComponent.short_name : "";
            onLocationSelected(address, countryCode, placeName);
        }
        catch (_error) {
            // Fallback: save text even if geocode fails
            onLocationSelected(address, "", placeName);
        }
    };
    return (_jsx("div", { className: "relative", ref: commandRef, children: _jsxs(Command, { shouldFilter: false, className: "overflow-visible bg-transparent", children: [_jsxs("div", { className: "relative", children: [_jsx(MapPin, { className: "absolute left-3 top-3 h-4 w-4 text-text-secondary z-10" }), _jsx(CommandPrimitive.Input, { id: id, value: value, onValueChange: (val) => {
                                setValue(val);
                                // FIXED: Update parent immediately so typing is saved even if no suggestion is clicked
                                onLocationSelected(val, "");
                                setOpen(!!val);
                            }, onFocus: () => setOpen(!!value), disabled: !ready, placeholder: placeholder, autoComplete: "off" // FIXED: Disable browser autocomplete
                            , className: cn("flex h-10 w-full rounded-sm border border-border-default bg-surface-muted pl-9 pr-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50") })] }), open && (status === "OK" || status === "ZERO_RESULTS") && (_jsx("div", { className: "absolute top-[calc(100%+4px)] left-0 w-full z-[1150] rounded-sm border border-border-default bg-surface-overlay text-text-primary shadow-lg outline-none animate-in fade-in-0 zoom-in-95", children: _jsxs(CommandList, { children: [_jsx(CommandGroup, { children: status === "OK" &&
                                    data.map(({ place_id, description, structured_formatting }) => (_jsxs(CommandItem, { value: description, onSelect: () => handleSelect(description, structured_formatting?.main_text), className: "cursor-pointer", children: [_jsx(MapPin, { className: "mr-2 h-4 w-4 shrink-0" }), _jsx("span", { children: description })] }, place_id))) }), status === "ZERO_RESULTS" && (_jsx(CommandEmpty, { children: "No results found." }))] }) }))] }) }));
}
