/**
 * SearchPage.tsx — Refined with A24 editorial aesthetic
 *
 * All map logic, search state, debouncing, and event handlers are unchanged.
 * Only the four layout surfaces owned by this file are touched:
 *
 * Desktop sidebar:
 *   shadow-lg removed — flat is the rule; borders carry hierarchy, not elevation.
 *   Sidebar search header: bg-surface-card/95 backdrop-blur removed — the sidebar
 *   already has a solid bg-surface-card background so the blur served no purpose.
 *   Simple border-b border-border-default separator instead.
 *
 * Mobile floating search bar:
 *   shadow-md removed. bg-surface-card/95 border backdrop-blur retained —
 *   the frosted glass reads as "floating over the map" without needing shadow depth.
 *
 * Mobile List/Map toggle button:
 *   Button variant="ghost" shadow-md → bare <button> with text-xs uppercase
 *   tracking-widest, matching the editorial pill treatment from Explore.tsx.
 *   No shadow. Sharp edges. Icon reduced to h-3.5 w-3.5.
 *
 * Mobile list overlay:
 *   bg-surface-card → bg-surface-default — the list slides in as a page,
 *   not as a card. Matches the page background colour.
 *
 * Map loading placeholder:
 *   h-8 w-8 text-text-secondary → h-4 w-4 text-text-disabled — subtle,
 *   consistent with loading states across the rest of the app.
 */
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Map as MapIcon, List as ListIcon, Loader2 } from "lucide-react";
import { ClientOnly } from "@/components/common/ClientOnly";
import { useDebounce } from "@/hooks/useDebounce";
import { getGeocode, getLatLng } from "@/lib/googleMapsGeocoding";
import { Bounds } from "@/utils/map";
import { useNavigate } from "react-router";

import { MapProvider, useMapContext } from "@/features/maps/providers/MapContext";
import { PlanoMap } from "@/features/maps/components/PlanoMap";
import { BuildingSidebar } from "@/features/maps/components/BuildingSidebar";
import { MapControls } from "@/features/maps/components/MapControls";
import { DiscoverySearchInput, Suggestion } from "@/features/search/components/DiscoverySearchInput";
import { useGlobalEntitySearch } from "@/features/search/hooks/useGlobalEntitySearch";
import { useIsMobile } from "@/hooks/use-mobile";

/** SSR/hydration skeleton — matches PlanoMap outer shell to avoid layout shift */
function MapLoadingPlaceholder() {
  return (
    <div
      className="relative z-0 flex h-full w-full items-center justify-center overflow-hidden bg-surface-default"
      aria-busy="true"
      aria-label="Loading map"
    >
      {/* Smaller, dimmer spinner — consistent with all other loading states */}
      <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
    </div>
  );
}

function SearchPageContent() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const {
    state: { bounds, filters },
    methods: { setFilter, moveMap, fitMapBounds },
  } = useMapContext();

  const [searchValue, setSearchValue] = useState(filters.query || "");
  const debouncedSearchValue = useDebounce(searchValue, 300);
  const { people, companies, isDiscovery } = useGlobalEntitySearch({ searchQuery: searchValue, bounds });
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    // Normalize empty string to undefined so both sides use the same "no query" sentinel.
    // Without this, `undefined !== ""` is always true and creates an infinite loop:
    // setFilter → new location object → new setFilter ref → effect re-runs → repeat.
    const normalized = debouncedSearchValue || undefined;
    if (filters.query !== normalized) {
      setFilter("query", normalized);
    }
  }, [debouncedSearchValue, filters.query, setFilter]);

  useEffect(() => {
    const query = filters.query || "";
    if (query !== searchValue) {
      setSearchValue(query);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleLocationSelect = (
    location: { lat: number; lng: number },
    bounds?: Bounds
  ) => {
    if (bounds) {
      fitMapBounds(bounds);
    } else {
      moveMap(location.lat, location.lng, 14);
    }
    if (isMobile) setViewMode("map");
  };

  const handleBuildingPick = (building: {
    id: string;
    name: string;
    location_lat?: number | null;
    location_lng?: number | null;
  }) => {
    setSearchValue("");
    setFilter("query", building.name);
    if (building.location_lat != null && building.location_lng != null) {
      moveMap(building.location_lat, building.location_lng, 16);
    }
    if (isMobile) setViewMode("map");
  };

  const handleLocationResultClick = async (placeId: string) => {
    try {
      const results = await getGeocode({ placeId });
      const { lat, lng } = await getLatLng(results[0]);

      let bounds: Bounds | undefined;
      const viewport = results[0].geometry.viewport;
      if (viewport && typeof viewport.getNorthEast === "function") {
        bounds = {
          north: viewport.getNorthEast().lat(),
          south: viewport.getSouthWest().lat(),
          east: viewport.getNorthEast().lng(),
          west: viewport.getSouthWest().lng(),
        };
      }

      handleLocationSelect({ lat, lng }, bounds);
      setSearchValue("");
    } catch {}
  };

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "map" ? "list" : "map"));
  };

  const mobileSearchBar = (
    <div className="flex items-center gap-2 w-full">
      <DiscoverySearchInput
        value={searchValue}
        onSearchChange={handleSearchChange}
        onLocationSelect={handleLocationSelect}
        onSuggestionsChange={setSuggestions}
        disableDropdown={viewMode === "list"}
        showMixedEntitySuggestions={viewMode === "map"}
        onBuildingPick={handleBuildingPick}
        onPersonPick={(p) => {
          setSearchValue("");
          navigate(`/person/${p.slug}`);
        }}
        onCompanyPick={(c) => {
          setSearchValue("");
          navigate(`/company/${c.slug}`);
        }}
        placeholder="Search..."
        className="flex-1"
      />
      <MapControls />
    </div>
  );

  return (
    <AppLayout isFullScreen={true}>
      <div className="relative flex h-[calc(100dvh-3.5rem-5rem)] w-full min-h-0 flex-col overflow-hidden md:fixed md:inset-x-0 md:bottom-0 md:left-0 md:right-0 md:top-16 md:h-auto">

        {/* ── Mobile: floating search bar ── */}
        {isMobile && (
          <div className="fixed left-4 right-4 top-4 z-40 safe-area-pt md:hidden">
            {/* No shadow — frosted glass border is sufficient over the map */}
            <div className="border border-border-default bg-surface-card/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-surface-card/90">
              {mobileSearchBar}
            </div>
          </div>
        )}

        {/* ── Desktop: left sidebar ── */}
        {/*
          shadow-lg removed — flat, border-only sidebar matches the editorial
          principle that borders carry hierarchy, not elevation.
        */}
        <div className="absolute bottom-0 left-0 top-0 z-20 hidden w-search-serp min-h-0 flex-col border-r border-border-default bg-surface-card transition-all duration-300 md:flex">

          {/* Sidebar search header — solid background, no backdrop blur needed */}
          <div className="p-4 border-b border-border-default flex items-center gap-2">
            <DiscoverySearchInput
              value={searchValue}
              onSearchChange={handleSearchChange}
              onLocationSelect={handleLocationSelect}
              onSuggestionsChange={setSuggestions}
              disableDropdown={true}
              showMixedEntitySuggestions={false}
              placeholder="Search buildings, people, companies..."
              className="flex-1"
            />
            <MapControls />
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <BuildingSidebar
              suggestions={suggestions}
              onLocationClick={handleLocationResultClick}
              people={people}
              companies={companies}
              isDiscovery={isDiscovery}
            />
          </div>
        </div>

        {/* ── Map ── */}
        <div className="relative h-full min-h-0 flex-1 transition-all duration-300 md:ml-search-serp">
          <ClientOnly fallback={<MapLoadingPlaceholder />}>
            <PlanoMap showEmptyMessage={true} />
          </ClientOnly>
        </div>

        {/* ── Mobile: List / Map toggle ── */}
        {/*
          Button variant="ghost" shadow-md → bare button with editorial
          typography. Matches the location pill treatment in Explore.tsx.
          No shadow. Sharp 0-radius edges. Uppercase tracked label.
        */}
        {isMobile && (
          <div className="absolute left-1/2 z-50 -translate-x-1/2 bottom-[calc(2rem+env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={toggleViewMode}
              className="inline-flex items-center gap-2 h-11 px-5 bg-surface-card/95 backdrop-blur-md border border-border-default text-xs font-medium uppercase tracking-widest text-text-primary hover:bg-surface-muted transition-colors"
              aria-label={
                viewMode === "map" ? "Show list view" : "Show map view"
              }
            >
              {viewMode === "map" ? (
                <>
                  <ListIcon className="h-3.5 w-3.5" />
                  List
                </>
              ) : (
                <>
                  <MapIcon className="h-3.5 w-3.5" />
                  Map
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Mobile: list overlay ── */}
        {/*
          bg-surface-card → bg-surface-default: the list slides in as a page,
          not as an elevated card surface.
        */}
        {isMobile && viewMode === "list" && (
          <div className="absolute inset-0 bg-surface-default z-40 flex flex-col animate-in slide-in-from-bottom-10 duration-200">
            <div className="flex-1 overflow-hidden relative">
              <BuildingSidebar
                suggestions={suggestions}
                onLocationClick={handleLocationResultClick}
                people={people}
                companies={companies}
                isDiscovery={isDiscovery}
                className="pb-24"
              />
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

export default function SearchPage() {
  return (
    <MapProvider>
      <SearchPageContent />
    </MapProvider>
  );
}