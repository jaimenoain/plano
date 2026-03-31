import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, MapPin, Maximize2, Minimize2 } from "lucide-react";
import { useUserLocation } from "@/hooks/useUserLocation";
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";
const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
export function BuildingMap({ lat, lng, className, status, socialContext, isExpanded, onToggleExpand, mapStyle, locationPrecision = 'exact', items, selectedId, isLoading }) {
    const mapRef = useRef(null);
    const [isSatellite, setIsSatellite] = useState(false);
    const { location: userLocation, requestLocation } = useUserLocation();
    // State to retain items while loading
    const [displayedItems, setDisplayedItems] = useState(items);
    useEffect(() => {
        if (items && items.length > 0) {
            setDisplayedItems(items);
        }
        else if (!isLoading) {
            // Only clear if not loading
            setDisplayedItems(items);
        }
    }, [items, isLoading]);
    useEffect(() => {
        requestLocation({ silent: true });
    }, []);
    const isApproximate = locationPrecision === 'approximate';
    let strokeClass = "text-gray-500";
    let fillClass = "fill-background";
    let dotBgClass = "bg-gray-500";
    if (status === 'visited') {
        strokeClass = "text-gray-600";
        fillClass = "fill-gray-600";
        dotBgClass = "bg-gray-600";
    }
    else if (status === 'pending') {
        strokeClass = "text-gray-500";
        fillClass = "fill-brand-primary";
        dotBgClass = "bg-brand-primary";
    }
    else if (socialContext) {
        strokeClass = "text-gray-500";
        fillClass = "fill-gray-300"; // Light Grey
        dotBgClass = "bg-gray-300";
    }
    if (isSatellite) {
        strokeClass = "text-white";
    }
    const pinColor = `${strokeClass} ${fillClass}`;
    const dotBorderClass = isSatellite ? "border-white" : "border-surface-default";
    // When expanded, we remove the default containment styling (relative, rounded, border)
    // to allow full screen behavior controlled by the parent's className.
    const containerBaseClass = isExpanded
        ? "overflow-hidden"
        : "relative rounded-xl overflow-hidden border border-white/10";
    const handleClusterClick = (cluster) => {
        if (!mapRef.current)
            return;
        const map = mapRef.current.getMap();
        const currentZoom = map.getZoom();
        const maxZoom = map.getMaxZoom();
        const nextZoom = Math.min(maxZoom, currentZoom + 2);
        mapRef.current.flyTo({
            center: [cluster.lng, cluster.lat],
            zoom: nextZoom,
            duration: 500,
        });
    };
    return (_jsxs("div", { className: `${containerBaseClass} ${className || ""}`, children: [_jsxs(Map, { ref: mapRef, initialViewState: {
                    longitude: lng,
                    latitude: lat,
                    zoom: 15
                }, mapLib: maplibregl, style: { width: "100%", height: "100%" }, mapStyle: isSatellite ? SATELLITE_MAP_STYLE : (mapStyle || DEFAULT_MAP_STYLE), attributionControl: false, children: [_jsx(NavigationControl, { position: "bottom-right" }), userLocation && (_jsx(Marker, { longitude: userLocation.lng, latitude: userLocation.lat, anchor: "center", style: { zIndex: 1 }, children: _jsxs("div", { className: "relative flex items-center justify-center", children: [_jsx("div", { className: "w-8 h-8 bg-blue-500/20 absolute rounded-full animate-pulse" }), _jsx("div", { className: "w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg relative z-10" })] }) })), isLoading && (_jsx("div", { className: "absolute top-0 left-0 right-0 h-1 bg-surface-default z-[100] overflow-hidden", children: _jsx("div", { className: "h-full w-full bg-brand-primary animate-pulse origin-left" }) })), displayedItems && displayedItems.length > 0 ? (displayedItems.map((item) => {
                        if (item.is_cluster) {
                            const cluster = item;
                            let sizeClass = "w-[30px] h-[30px] text-xs";
                            if (cluster.count >= 1000)
                                sizeClass = "w-[50px] h-[50px] text-base";
                            else if (cluster.count >= 100)
                                sizeClass = "w-[40px] h-[40px] text-sm";
                            return (_jsx(Marker, { longitude: cluster.lng, latitude: cluster.lat, anchor: "center", style: { zIndex: 20 }, onClick: (e) => {
                                    e.originalEvent.stopPropagation();
                                    handleClusterClick(cluster);
                                }, children: _jsx("div", { className: `${sizeClass} rounded-full bg-brand-primary text-brand-primary-foreground shadow-lg flex items-center justify-center font-bold transition-transform duration-200 hover:scale-110 hover:z-[50] cursor-pointer`, children: cluster.count >= 1000 ? `${(cluster.count / 1000).toFixed(1)}k` : cluster.count }) }, cluster.id));
                        }
                        else {
                            const building = item;
                            const isSelected = selectedId === String(building.id);
                            // For list items, we use default styling unless we extend MapItem to include status/etc.
                            // Assuming default gray pin for list items.
                            // Selected pin gets higher z-index (30) vs unselected (10).
                            // We reuse the pin rendering logic but with default colors for list items
                            // since BuildingPoint doesn't have status info currently.
                            // We could potentially pass a lookup map for status if needed, but requirements didn't specify.
                            const listPinColor = isSelected ? "text-brand-primary fill-background" : "text-gray-500 fill-background";
                            return (_jsx(Marker, { longitude: building.lng, latitude: building.lat, anchor: "bottom", style: { zIndex: isSelected ? 30 : 10 }, onClick: () => {
                                    // Optional: handle building click if needed
                                }, children: _jsxs("div", { className: "relative group hover:z-50", children: [_jsx(MapPin, { className: `w-8 h-8 drop-shadow-lg ${listPinColor}` }), _jsx("div", { className: "absolute top-[41.7%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] h-[25%] bg-white rounded-full pointer-events-none" })] }) }, building.id));
                        }
                    })) : (_jsx(Marker, { longitude: lng, latitude: lat, anchor: isApproximate ? "center" : "bottom", style: { zIndex: 10 }, children: isApproximate ? (_jsx("div", { className: `w-6 h-6 rounded-full border-2 ${dotBorderClass} ${dotBgClass} drop-shadow-lg` })) : (_jsxs("div", { className: "relative", children: [_jsx(MapPin, { className: `w-8 h-8 drop-shadow-lg ${pinColor}` }), _jsx("div", { className: "absolute top-[41.7%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] h-[25%] bg-white rounded-full pointer-events-none" })] })) }))] }), isExpanded && (_jsxs("button", { onClick: (e) => {
                    e.stopPropagation();
                    setIsSatellite(!isSatellite);
                }, className: "absolute top-2 left-2 p-2 bg-surface-default/90 backdrop-blur rounded-md border shadow-sm hover:bg-surface-muted transition-colors z-10 flex items-center gap-2", title: isSatellite ? "Show Map" : "Show Satellite", children: [_jsx(Layers, { className: "w-4 h-4" }), _jsx("span", { className: "text-xs font-medium", children: isSatellite ? "Map" : "Satellite" })] })), onToggleExpand && (_jsx("button", { onClick: (e) => {
                    e.stopPropagation();
                    onToggleExpand();
                }, className: "absolute top-2 right-2 p-2 bg-surface-default/90 backdrop-blur rounded-md border shadow-sm hover:bg-surface-muted transition-colors z-10", title: isExpanded ? "Collapse Map" : "Expand Map", children: isExpanded ? _jsx(Minimize2, { className: "w-4 h-4" }) : _jsx(Maximize2, { className: "w-4 h-4" }) }))] }));
}
