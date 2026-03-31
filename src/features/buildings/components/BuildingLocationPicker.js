import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { LocationInput } from "@/components/ui/LocationInput";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin, Layers } from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { extractLocationDetails } from "@/lib/location-utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";
const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
export function BuildingLocationPicker({ initialLocation, initialPrecision = 'exact', onLocationChange }) {
    const [selectedAddress, setSelectedAddress] = useState(initialLocation.address);
    const [locationPrecision, setLocationPrecision] = useState(initialPrecision);
    const [isSatellite, setIsSatellite] = useState(true);
    const [markerPosition, setMarkerPosition] = useState(initialLocation.lat !== null && initialLocation.lng !== null
        ? { lat: initialLocation.lat, lng: initialLocation.lng }
        : null);
    // Store details to re-emit when precision changes
    const [locationDetails, setLocationDetails] = useState({
        city: initialLocation.city || null,
        country: initialLocation.country || null
    });
    const [viewState, setViewState] = useState({
        latitude: initialLocation.lat ?? 51.5074,
        longitude: initialLocation.lng ?? -0.1278,
        zoom: 15,
    });
    // Update view state if initialLocation changes (e.g. data loaded)
    useEffect(() => {
        if (initialLocation.lat !== null && initialLocation.lng !== null) {
            setViewState(prev => ({
                ...prev,
                latitude: initialLocation.lat,
                longitude: initialLocation.lng,
            }));
            setMarkerPosition({
                lat: initialLocation.lat,
                lng: initialLocation.lng
            });
        }
        setSelectedAddress(initialLocation.address);
        if (initialLocation.city !== undefined) {
            setLocationDetails({
                city: initialLocation.city || null,
                country: initialLocation.country || null
            });
        }
        // Auto-geocode if location is missing but address is present
        if ((initialLocation.lat === null || initialLocation.lng === null) && initialLocation.address) {
            const attemptGeocode = async () => {
                try {
                    const results = await getGeocode({ address: initialLocation.address });
                    if (results && results.length > 0) {
                        const { lat, lng } = await getLatLng(results[0]);
                        const details = extractLocationDetails(results[0]);
                        setMarkerPosition({ lat, lng });
                        setViewState(prev => ({ ...prev, latitude: lat, longitude: lng }));
                        setLocationDetails(details);
                        onLocationChange({
                            lat,
                            lng,
                            address: results[0].formatted_address,
                            city: details.city,
                            country: details.country,
                            precision: locationPrecision
                        });
                    }
                }
                catch (_err) {
                }
            };
            attemptGeocode();
        }
    }, [initialLocation.lat, initialLocation.lng, initialLocation.address, initialLocation.city, initialLocation.country]);
    // Handle precision change specifically
    const handlePrecisionChange = (checked) => {
        const newPrecision = checked ? 'approximate' : 'exact';
        setLocationPrecision(newPrecision);
        if (markerPosition) {
            onLocationChange({
                lat: markerPosition.lat,
                lng: markerPosition.lng,
                address: selectedAddress,
                city: locationDetails.city,
                country: locationDetails.country,
                precision: newPrecision
            });
        }
    };
    const updateLocation = (lat, lng, address, details) => {
        setMarkerPosition({ lat, lng });
        setSelectedAddress(address);
        setLocationDetails(details);
        onLocationChange({
            lat,
            lng,
            address,
            city: details.city,
            country: details.country,
            precision: locationPrecision
        });
    };
    const handleLocationSelected = async (address, countryCode, placeName) => {
        setSelectedAddress(address);
        // Only move map if this seems like a genuine selection
        if (countryCode || placeName) {
            try {
                const results = await getGeocode({ address });
                if (results && results.length > 0) {
                    const { lat, lng } = await getLatLng(results[0]);
                    setViewState({
                        latitude: lat,
                        longitude: lng,
                        zoom: 16
                    });
                    const details = extractLocationDetails(results[0]);
                    updateLocation(lat, lng, results[0].formatted_address, details);
                }
            }
            catch (_error) {
            }
        }
    };
    const handleMapClick = async (event) => {
        const { lat, lng } = event.lngLat;
        // Optimistic update
        setMarkerPosition({ lat, lng });
        try {
            const results = await getGeocode({ location: { lat, lng } });
            if (results && results.length > 0) {
                const address = results[0].formatted_address;
                const details = extractLocationDetails(results[0]);
                updateLocation(lat, lng, address, details);
            }
        }
        catch (_error) {
            // Fallback with existing address or empty
            updateLocation(lat, lng, selectedAddress, { city: null, country: null });
        }
    };
    const handleMarkerDragEnd = async (event) => {
        const { lat, lng } = event.lngLat;
        setMarkerPosition({ lat, lng });
        try {
            const results = await getGeocode({ location: { lat, lng } });
            if (results && results.length > 0) {
                const address = results[0].formatted_address;
                const details = extractLocationDetails(results[0]);
                updateLocation(lat, lng, address, details);
            }
        }
        catch (_error) {
            updateLocation(lat, lng, selectedAddress, { city: null, country: null });
        }
    };
    return (_jsxs("div", { className: "grid gap-6 md:grid-cols-[350px_1fr]", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Location Search" }), _jsx(LocationInput, { value: selectedAddress, onLocationSelected: handleLocationSelected, placeholder: "Search for address...", searchTypes: [], className: "w-full" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Search or drag the pin on the map to change location." })] }), _jsxs("div", { className: "flex items-start space-x-2 pt-2", children: [_jsx(Checkbox, { id: "approximate-location-picker", checked: locationPrecision === 'approximate', onCheckedChange: handlePrecisionChange }), _jsxs("div", { className: "grid gap-1.5 leading-none", children: [_jsx(Label, { htmlFor: "approximate-location-picker", className: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", children: "Approximate Location" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Check this if the exact location is unknown. The pin will represent a general area (e.g. city center)." })] })] })] }), _jsxs("div", { className: "h-[400px] rounded-xl overflow-hidden border shadow-sm relative bg-surface-muted", children: [_jsxs(Map, { ...viewState, onMove: evt => setViewState(evt.viewState), onClick: handleMapClick, mapLib: maplibregl, style: { width: "100%", height: "100%" }, mapStyle: isSatellite ? SATELLITE_MAP_STYLE : DEFAULT_MAP_STYLE, cursor: "crosshair", children: [_jsx(NavigationControl, { position: "top-right" }), markerPosition && (_jsx(Marker, { longitude: markerPosition.lng, latitude: markerPosition.lat, anchor: "bottom", draggable: true, onDragEnd: handleMarkerDragEnd, children: _jsxs("div", { className: "flex flex-col items-center", children: [locationPrecision === 'approximate' ? (_jsx("div", { className: "w-6 h-6 rounded-full bg-brand-primary border-2 border-surface-default drop-shadow-md transition-transform" })) : (_jsx(MapPin, { className: "h-8 w-8 text-brand-primary fill-brand-primary drop-shadow-md transition-colors" })), _jsx("div", { className: "w-2 h-1 bg-black/30 rounded-full blur-[1px]" })] }) }))] }), _jsxs("button", { onClick: (e) => {
                            e.stopPropagation();
                            setIsSatellite(!isSatellite);
                        }, className: "absolute top-2 left-2 p-2 bg-surface-default/90 backdrop-blur rounded-md border shadow-sm hover:bg-surface-muted transition-colors z-10 flex items-center gap-2", title: isSatellite ? "Show Map" : "Show Satellite", type: "button", children: [_jsx(Layers, { className: "w-4 h-4" }), _jsx("span", { className: "text-xs font-medium", children: isSatellite ? "Map" : "Satellite" })] })] })] }));
}
