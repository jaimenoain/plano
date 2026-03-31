import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from "react-dom";
import { useSearchParams } from 'react-router';
import MapGL, { NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Maximize2, Minimize2 } from "lucide-react";
import { useURLMapState } from '@/features/maps/hooks/useURLMapState';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { MapErrorBoundary } from './MapErrorBoundary';
import { MapMarkers } from './MapMarkers';
import { ItineraryRoutes } from './ItineraryRoutes';
import { getBoundsFromBuildings } from '@/utils/map';
import { useItineraryStore } from '@/features/itinerary/stores/useItineraryStore';
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
function CollectionMapGLContent({ buildings, highlightedId, setHighlightedId, onRemoveItem, onAddCandidate, onUpdateMarkerNote: _onUpdateMarkerNote, onRemoveMarker: _onRemoveMarker, showSavedCandidates: _showSavedCandidates, showItinerary }) {
    const { lat, lng, zoom, setMapURL } = useURLMapState();
    const { updateMapState } = useStableMapUpdate(setMapURL);
    const mapRef = useRef(null);
    const days = useItineraryStore((state) => state.days);
    // Map building IDs to their itinerary sequence and day index
    const itineraryMap = useMemo(() => {
        if (!showItinerary)
            return new Map();
        const map = new Map();
        if (days) {
            days.forEach((day, dayIndex) => {
                day.stops?.forEach((stop, index) => {
                    const key = stop.referenceId || stop.id;
                    if (!map.has(key)) {
                        map.set(key, {
                            dayIndex: dayIndex,
                            sequence: index + 1
                        });
                    }
                });
            });
        }
        return map;
    }, [days, showItinerary]);
    const [searchParams] = useSearchParams();
    // Determine if we should auto-fit bounds on mount (only if no explicit URL params provided)
    const [shouldAutoFit] = useState(() => !searchParams.has('lat') && !searchParams.has('lng'));
    const [isSatellite, setIsSatellite] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasFittedBounds, setHasFittedBounds] = useState(false);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const geolocateControlRef = useRef(null);
    const [viewState, setViewState] = useState({
        latitude: lat,
        longitude: lng,
        zoom: zoom
    });
    // Sync local state with URL
    useEffect(() => {
        setViewState(prev => {
            const isSame = Math.abs(prev.latitude - lat) < 0.000001 &&
                Math.abs(prev.longitude - lng) < 0.000001 &&
                Math.abs(prev.zoom - zoom) < 0.01;
            if (isSame)
                return prev;
            return { latitude: lat, longitude: lng, zoom: zoom };
        });
    }, [lat, lng, zoom]);
    // Fit bounds logic
    useEffect(() => {
        if (!hasFittedBounds && buildings.length > 0 && mapRef.current && isMapLoaded) {
            if (shouldAutoFit) {
                const bounds = getBoundsFromBuildings(buildings);
                if (bounds) {
                    // Calculate target state deterministically
                    const camera = mapRef.current.getMap().cameraForBounds([
                        [bounds.west, bounds.south],
                        [bounds.east, bounds.north]
                    ], { padding: 50 });
                    if (camera && camera.center && typeof camera.zoom === 'number') {
                        const { center, zoom } = camera;
                        const ll = maplibregl.LngLat.convert(center);
                        // Update both local viewState and URL immediately
                        // This atomic update prevents race conditions with the URL sync hook
                        setViewState({
                            latitude: ll.lat,
                            longitude: ll.lng,
                            zoom: zoom
                        });
                        updateMapState({
                            lat: ll.lat,
                            lng: ll.lng,
                            zoom: zoom
                        }, true);
                        setHasFittedBounds(true);
                    }
                }
            }
            else {
                setHasFittedBounds(true);
            }
        }
    }, [buildings, hasFittedBounds, shouldAutoFit, isMapLoaded, updateMapState]);
    const onMove = useCallback((evt) => {
        setViewState(evt.viewState);
        updateMapState({
            lat: evt.viewState.latitude,
            lng: evt.viewState.longitude,
            zoom: evt.viewState.zoom
        }, false);
    }, [updateMapState]);
    const onMoveEnd = useCallback((evt) => {
        updateMapState({
            lat: evt.viewState.latitude,
            lng: evt.viewState.longitude,
            zoom: evt.viewState.zoom
        }, true);
    }, [updateMapState]);
    // Transform DiscoveryBuilding[] to ClusterResponse[]
    const clusters = useMemo(() => {
        return buildings.map(b => {
            const itineraryInfo = itineraryMap.get(b.id);
            return {
                id: b.id,
                lat: b.location_lat,
                lng: b.location_lng,
                is_cluster: false,
                count: 1,
                rating: b.personal_rating || null,
                status: b.personal_status || null,
                color: b.color || null,
                name: b.name,
                slug: b.slug || undefined,
                image_url: b.main_image_url || undefined,
                image_attribution: b.image_attribution || undefined,
                // Custom fields
                is_custom_marker: b.isMarker,
                marker_category: b.markerCategory,
                notes: b.notes ?? null,
                is_candidate: b.isCandidate,
                address: b.address ?? null,
                google_place_id: b.google_place_id,
                website: b.website,
                // Itinerary fields
                itinerary_sequence: itineraryInfo?.sequence,
                itinerary_day_index: itineraryInfo?.dayIndex,
            };
        });
    }, [buildings, itineraryMap]);
    const handleAddCandidate = useCallback((id) => {
        if (onAddCandidate) {
            const building = buildings.find(b => b.id === id);
            if (building) {
                onAddCandidate(building);
            }
        }
    }, [onAddCandidate, buildings]);
    const handleRemove = onRemoveItem;
    const mapContent = (_jsxs("div", { className: `relative h-full w-full overflow-hidden bg-surface-default ${isExpanded ? "fixed inset-0 z-[9999]" : ""}`, children: [_jsxs(MapGL, { ref: mapRef, ...viewState, onMove: onMove, onMoveEnd: onMoveEnd, onLoad: () => setIsMapLoaded(true), mapLib: maplibregl, mapStyle: isSatellite ? SATELLITE_MAP_STYLE : MAP_STYLE, attributionControl: false, onClick: () => setHighlightedId(null), children: [_jsx(GeolocateControl, { ref: geolocateControlRef, position: "bottom-right", positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserLocation: true }), _jsx(NavigationControl, { position: "bottom-right" }), showItinerary && _jsx(ItineraryRoutes, {}), _jsx(MapMarkers, { clusters: clusters, highlightedId: highlightedId, setHighlightedId: setHighlightedId, onRemoveFromCollection: handleRemove, onAddCandidate: handleAddCandidate })] }), _jsx("div", { className: "absolute top-2 left-2 flex flex-col gap-2 z-[60]", children: _jsxs("button", { onClick: (e) => {
                        e.stopPropagation();
                        setIsSatellite(!isSatellite);
                    }, className: "p-2 bg-surface-default/90 backdrop-blur rounded-md border shadow-sm hover:bg-surface-muted transition-colors flex items-center gap-2", title: isSatellite ? "Show Map" : "Show Satellite", children: [_jsx(Layers, { className: "w-4 h-4" }), _jsx("span", { className: "text-xs font-medium hidden sm:inline", children: isSatellite ? "Map" : "Satellite" })] }) }), _jsx("button", { onClick: (e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                }, className: "absolute top-2 right-2 p-2 bg-surface-default/90 backdrop-blur rounded-md border shadow-sm hover:bg-surface-muted transition-colors z-[60]", title: isExpanded ? "Collapse Map" : "Expand Map", children: isExpanded ? _jsx(Minimize2, { className: "w-4 h-4" }) : _jsx(Maximize2, { className: "w-4 h-4" }) })] }));
    if (isExpanded) {
        return createPortal(mapContent, document.body);
    }
    return mapContent;
}
export function CollectionMapGL(props) {
    return (_jsx(MapErrorBoundary, { children: _jsx(CollectionMapGLContent, { ...props }) }));
}
