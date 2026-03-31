import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, List as ListIcon } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapProvider, useMapContext } from "@/features/maps/providers/MapContext";
import { PlanoMap } from "@/features/maps/components/PlanoMap";
import { BuildingSidebar } from "@/features/maps/components/BuildingSidebar";
import { MapControls } from "@/features/maps/components/MapControls";
import { DiscoverySearchInput } from "@/features/search/components/DiscoverySearchInput";
import { useArchitectSearch } from "@/features/search/hooks/useArchitectSearch";
const SIDEBAR_EXPANDED_OFFSET = 208; // Approx 13rem
function SearchPageContent() {
    const { state, isMobile } = useSidebar();
    const isSidebarExpanded = state === 'expanded' && !isMobile;
    const { state: { filters }, methods: { setFilter, moveMap, fitMapBounds } } = useMapContext();
    // Local search state
    const [searchValue, setSearchValue] = useState(filters.query || "");
    const debouncedSearchValue = useDebounce(searchValue, 300);
    // Architect Search
    const { architects } = useArchitectSearch({ searchQuery: searchValue });
    // View mode state (map vs list) for mobile
    const [viewMode, setViewMode] = useState('map');
    // Location suggestions state
    const [suggestions, setSuggestions] = useState([]);
    // Sync local search with context filters
    useEffect(() => {
        // Only update if different to avoid loops/unnecessary updates
        if (filters.query !== debouncedSearchValue) {
            setFilter('query', debouncedSearchValue);
        }
    }, [debouncedSearchValue, filters.query, setFilter]);
    // Sync external filter changes (e.g. back button) to local state
    useEffect(() => {
        // If filters.query is undefined, we assume empty string
        const query = filters.query || "";
        if (query !== searchValue) {
            setSearchValue(query);
        }
    }, [filters.query]);
    // Handlers
    const handleSearchChange = (value) => {
        setSearchValue(value);
    };
    const handleLocationSelect = (location, bounds) => {
        if (bounds) {
            fitMapBounds(bounds);
        }
        else {
            moveMap(location.lat, location.lng, 14); // Zoom to 14 on select
        }
        if (isMobile) {
            setViewMode('map');
        }
    };
    const handleLocationResultClick = async (placeId) => {
        try {
            const results = await getGeocode({ placeId });
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
            handleLocationSelect({ lat, lng }, bounds);
            setSearchValue(""); // Clear search value
        }
        catch {
        }
    };
    const toggleViewMode = () => {
        setViewMode(prev => prev === 'map' ? 'list' : 'map');
    };
    const mobileSearchBar = (_jsxs("div", { className: "flex items-center gap-2 w-full", children: [_jsx(DiscoverySearchInput, { value: searchValue, onSearchChange: handleSearchChange, onLocationSelect: handleLocationSelect, onSuggestionsChange: setSuggestions, disableDropdown: viewMode === 'list', placeholder: "Search...", className: "flex-1" }), _jsx(MapControls, {})] }));
    return (_jsx(AppLayout, { isFullScreen: true, showHeader: true, variant: "map", searchBar: mobileSearchBar, children: _jsxs("div", { className: "relative flex flex-col h-full w-full overflow-hidden", children: [_jsxs("div", { className: `hidden md:flex flex-col w-[400px] bg-surface-card border-r border-border-default absolute top-0 bottom-0 z-20 shadow-lg transition-all duration-300`, style: { left: isSidebarExpanded ? SIDEBAR_EXPANDED_OFFSET : 0 }, children: [_jsxs("div", { className: "p-4 border-b flex items-center gap-2 bg-surface-card/95 backdrop-blur supports-[backdrop-filter]:bg-surface-card/60", children: [_jsx(DiscoverySearchInput, { value: searchValue, onSearchChange: handleSearchChange, onLocationSelect: handleLocationSelect, onSuggestionsChange: setSuggestions, disableDropdown: true, placeholder: "Search buildings, architects...", className: "flex-1" }), _jsx(MapControls, {})] }), _jsx("div", { className: "flex-1 overflow-hidden relative", children: _jsx(BuildingSidebar, { suggestions: suggestions, onLocationClick: handleLocationResultClick, architects: architects }) })] }), _jsx("div", { className: `flex-1 h-full relative transition-all duration-300`, style: {
                        marginLeft: isMobile ? 0 : 400 + (isSidebarExpanded ? SIDEBAR_EXPANDED_OFFSET : 0)
                    }, children: _jsx(PlanoMap, { showEmptyMessage: true }) }), isMobile && (_jsx("div", { className: "absolute bottom-8 left-1/2 -translate-x-1/2 z-50", children: _jsx(Button, { onClick: toggleViewMode, className: "rounded-sm bg-surface-card border border-border-default shadow-md px-6 py-3 flex items-center gap-2", variant: "ghost", "aria-label": viewMode === 'map' ? 'Show list view' : 'Show map view', children: viewMode === 'map' ? (_jsxs(_Fragment, { children: [_jsx(ListIcon, { className: "mr-2 h-4 w-4" }), "List"] })) : (_jsxs(_Fragment, { children: [_jsx(MapIcon, { className: "mr-2 h-4 w-4" }), "Map"] })) }) })), isMobile && viewMode === 'list' && (_jsx("div", { className: "absolute inset-0 bg-surface-card z-40 flex flex-col animate-in slide-in-from-bottom-10 duration-200", children: _jsx("div", { className: "flex-1 overflow-hidden relative", children: _jsx(BuildingSidebar, { suggestions: suggestions, onLocationClick: handleLocationResultClick, architects: architects, className: "pb-24" }) }) }))] }) }));
}
export default function SearchPage() {
    return (_jsx(MapProvider, { children: _jsx(SearchPageContent, {}) }));
}
