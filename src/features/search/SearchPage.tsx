/**
 * SearchPage.tsx — Refined with A24 editorial aesthetic
 *
 * All map logic, search state, debouncing, and event handlers are unchanged.
 * Only the four layout surfaces owned by this file are touched:
 *
 * Desktop sidebar:
 *   shadow-lg removed — flat is the rule; borders carry hierarchy, not elevation.
 *   Sidebar search header: bg-surface-card/95 backdrop-blur-sm removed — the sidebar
 *   already has a solid bg-surface-card background so the blur served no purpose.
 *   Simple border-b border-border-default separator instead.
 *
 * Mobile floating search bar:
 *   shadow-md removed. bg-surface-card/95 border backdrop-blur-sm retained —
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
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Map as MapIcon, List as ListIcon, Loader2 } from "lucide-react";
import { ClientOnly } from "@/components/common/ClientOnly";
import { getGeocode, getLatLng } from "@/lib/googleMapsGeocoding";
import { Bounds, getBoundsFromBuildings } from "@/utils/map";
import { useNavigate } from "react-router";
import type { SearchBuildingsV2Filters } from "@/features/search/api/searchBuildingsV2";

import { resolveConstructionStatuses } from "@/lib/buildingStatus";
import { MapProvider, useMapContext } from "@/features/maps/providers/MapContext";
import { PlanoMap } from "@/features/maps/components/PlanoMap";
import { BuildingSidebar } from "@/features/maps/components/BuildingSidebar";
import { MapControls } from "@/features/maps/components/MapControls";
import { DiscoverySearchInput, Suggestion } from "@/features/search/components/DiscoverySearchInput";
import { useGlobalEntitySearch } from "@/features/search/hooks/useGlobalEntitySearch";
import { useUnifiedSearch } from "@/features/search/hooks/useUnifiedSearch";
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
    methods: { setFilter, moveMap, fitMapBounds, setFindModeBuildings },
  } = useMapContext();

  const [searchValue, setSearchValueState] = useState(filters.query || "");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(filters.query || "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resettable 300ms debounce (replaces useDebounce so we can flush synchronously).
  // Typing path: update the box immediately, debounce the downstream query.
  const setSearchValue = (val: string) => {
    setSearchValueState(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearchValue(val), 300);
  };

  // Clear EVERY hop of the query chain in one synchronous step and drop back to
  // browse mode. Forcing debouncedSearchValue to "" on the same tick is the key:
  // isFindMode is false on the next render, so the sync effects can't resurrect
  // the stale text and the map falls through to browseClusters for the new viewport.
  const clearSearchToBrowse = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSearchValueState("");
    setDebouncedSearchValue("");
    setFilter("query", undefined);
    setFindModeBuildings(null);
  };

  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Find mode: query >= 2 chars after debounce
  const isFindMode = debouncedSearchValue.trim().length >= 2;

  // Map MapFilters → SearchBuildingsV2Filters so Find-mode RPCs respect the
  // same global filters (credits, taxonomy, size, awards, access) as Browse mode.
  const findModeFilters = useMemo((): SearchBuildingsV2Filters | undefined => {
    const f: SearchBuildingsV2Filters = {};
    if (filters.creditCompany?.id) f.credit_company_id = filters.creditCompany.id;
    if (filters.creditRoles?.length) f.credit_roles = filters.creditRoles;
    if (filters.category) f.category_id = filters.category;
    if (filters.typologies?.length) f.typology_ids = filters.typologies;
    if (filters.attributes?.length) f.attribute_ids = filters.attributes;
    // Construction status: mirror the Browse surfaces exactly (explicit picks →
    // inclusion; Show-lost / default → exclusion) so the Building-status filter
    // behaves identically in Find mode.
    const construction = resolveConstructionStatuses(filters);
    if (construction.construction_statuses) f.construction_statuses = construction.construction_statuses;
    if (construction.exclude_construction_statuses) f.exclude_construction_statuses = construction.exclude_construction_statuses;
    if (filters.sizeCategories?.length) f.size_categories = filters.sizeCategories;
    if (filters.minSizeSqm) f.min_size_sqm = filters.minSizeSqm;
    if (filters.maxSizeSqm) f.max_size_sqm = filters.maxSizeSqm;
    if (filters.minStoreys) f.min_storeys = filters.minStoreys;
    if (filters.maxStoreys) f.max_storeys = filters.maxStoreys;
    if (filters.awardId) f.award_id = filters.awardId;
    if (filters.awardOutcome) f.award_outcome = filters.awardOutcome;
    if (filters.awardYearFrom) f.award_year_from = filters.awardYearFrom;
    if (filters.awardYearTo) f.award_year_to = filters.awardYearTo;
    if (filters.accessLevels?.length) f.access_levels = filters.accessLevels;
    if (filters.accessLogistics?.length) f.access_logistics = filters.accessLogistics;
    if (filters.accessCosts?.length) f.access_costs = filters.accessCosts;
    if (filters.centuries?.length) f.centuries = filters.centuries;
    // Library filters — Folders/Collections and Curators & friends — so Find mode
    // narrows to the same set as Browse.
    if (filters.collections?.length) f.collections = filters.collections.map((c) => c.id);
    if (filters.folderIds?.length) f.folders = filters.folderIds;
    const ratedBy = filters.contacts?.map((c) => c.name) ?? filters.ratedBy;
    if (ratedBy?.length) f.rated_by = ratedBy;
    if (filters.filterContacts) f.filter_contacts = true;
    if (filters.contactMinRating) f.contact_min_rating = filters.contactMinRating;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [filters]);

  // Find mode — three parallel RPCs, no bbox.
  // Pass the RAW input value: useUnifiedSearch debounces `query` internally
  // (useDebounce 300ms), so feeding it the already-debounced value stacked two
  // 300ms delays (~600ms) before results appeared. The page's debounced value is
  // still used for isFindMode gating and the URL/fit-bounds effects below.
  const findResults = useUnifiedSearch({
    query: searchValue,
    filters: findModeFilters,
    minLength: 2,
  });

  // Browse mode — people/companies from the existing global entity search (no-query path)
  const browseEntities = useGlobalEntitySearch({
    searchQuery: "",
    bounds,
    enabled: !isFindMode,
  });

  // Derived people/companies for BuildingSidebar
  const people = isFindMode ? findResults.people : browseEntities.people;
  const companies = isFindMode ? findResults.companies : browseEntities.companies;
  const isDiscovery = !isFindMode;

  // Push find-mode building results into MapContext so PlanoMap uses them as pins
  const lastFitQuery = useRef<string | null>(null);
  useEffect(() => {
    if (!isFindMode) {
      setFindModeBuildings(null);
      lastFitQuery.current = null;
      return;
    }
    setFindModeBuildings(findResults.buildings);

    // Fly to fit the result set on the first response for each distinct query
    const q = debouncedSearchValue.trim();
    if (findResults.buildings.length > 0 && q !== lastFitQuery.current) {
      const pts = findResults.buildings
        .filter((b) => b.lat != null && b.lng != null)
        .map((b) => ({ location_lat: b.lat as number, location_lng: b.lng as number }));
      const newBounds = getBoundsFromBuildings(pts);
      if (newBounds) {
        fitMapBounds(newBounds);
        lastFitQuery.current = q;
      }
    }
  }, [isFindMode, findResults.buildings, debouncedSearchValue, setFindModeBuildings, fitMapBounds]);

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
  }, [filters.query]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleLocationSelect = (
    location: { lat: number; lng: number },
    bounds?: Bounds
  ) => {
    // Single choke point for every location navigation (inline autocomplete +
    // sidebar location row). Reset the whole query chain so the page browses the
    // new viewport instead of staying stuck in empty find mode with stale text.
    clearSearchToBrowse();
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
    } catch { /* geocode failed (no result / network / API error): leave current view unchanged */ }
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
        {/* Positioned below the MobileTopBar (h-14 = 3.5rem) + safe-area-inset-top */}
        {isMobile && (
          <div className="fixed left-4 right-4 top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem)] z-40 md:hidden">
            {/* No shadow — frosted glass border is sufficient over the map */}
            <div className="border border-border-default bg-surface-card/95 p-1 backdrop-blur-sm supports-backdrop-filter:bg-surface-card/90 focus-within:border-brand-primary">
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
            {/* Desktop only — the sidebar is merely CSS-hidden on mobile, and a
                second mounted FilterDrawer/useBuildingSearch clobbers the URL
                filter params with its stale state (see SearchPage.test.tsx). */}
            {!isMobile && <MapControls />}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <BuildingSidebar
              suggestions={suggestions}
              onLocationClick={handleLocationResultClick}
              people={people}
              companies={companies}
              isDiscovery={isDiscovery}
              findModeBuildings={isFindMode ? findResults.buildings : null}
              findModeQuery={isFindMode ? debouncedSearchValue : undefined}
              onSmartFilterApplied={() => setSearchValue("")}
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
                findModeBuildings={isFindMode ? findResults.buildings : null}
                findModeQuery={isFindMode ? debouncedSearchValue : undefined}
                onSmartFilterApplied={() => setSearchValue("")}
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