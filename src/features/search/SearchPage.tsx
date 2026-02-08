import { lazy, Suspense, useRef, useEffect, useMemo, useCallback, useState } from "react";
import { ErrorBoundary } from 'react-error-boundary';
import type { BuildingDiscoveryMapRef } from "@/components/common/BuildingDiscoveryMap";
import { useSidebar } from "@/components/ui/sidebar";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useBuildingSearch } from "./hooks/useBuildingSearch";
import { getBoundsFromBuildings } from "@/utils/map";
import { DiscoveryList } from "./components/DiscoveryList";
import { DiscoveryBuilding } from "./components/types";
import { DiscoverySearchInput } from "./components/DiscoverySearchInput";
import { SearchFilters } from "./components/SearchFilters";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, List as ListIcon, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BuildingDiscoveryMap = lazy(() => 
  import("@/components/common/BuildingDiscoveryMap").then(module => ({ 
    default: module.BuildingDiscoveryMap 
  }))
);

// Debug utility - only logs in development
const DEBUG = process.env.NODE_ENV === 'development';
const debug = {
  log: (...args: any[]) => DEBUG && console.log(...args),
  warn: (...args: any[]) => DEBUG && console.warn(...args),
  error: (...args: any[]) => console.error(...args) // Always log errors
};

// Constants
const REGION_UPDATE_DELAY = 500;
const PROGRAMMATIC_MOVE_DURATION = 1500;
const FLY_TO_ZOOM = 16;
const LIST_SIDEBAR_WIDTH = 400;

/**
 * Error fallback component for map loading failures
 */
function MapErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void 
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <AlertCircle className="w-16 h-16 text-red-500" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load map
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={resetErrorBoundary} variant="outline">
          Try Again
        </Button>
      </div>
    </div>
  );
}

/**
 * Reusable list sidebar component
 */
function ListSidebar({ 
  buildings, 
  isLoading, 
  onBuildingClick, 
  searchQuery,
  className,
  header
}: {
  buildings: DiscoveryBuilding[];
  isLoading: boolean;
  onBuildingClick?: (building: DiscoveryBuilding) => void;
  searchQuery: string;
  className?: string;
  header?: React.ReactNode;
}) {
  return (
    <div className={className}>
      {header && <div className="p-4 border-b">{header}</div>}
      <DiscoveryList
        buildings={buildings}
        isLoading={isLoading}
        onBuildingClick={onBuildingClick}
        searchQuery={searchQuery}
      />
    </div>
  );
}

export default function SearchPage() {
  const mapRef = useRef<BuildingDiscoveryMapRef | null>(null);
  const { state, isMobile } = useSidebar();
  const { user } = useAuth();

  const {
    buildings,
    isLoading,
    isFetching,
    searchQuery,
    setSearchQuery,
    updateLocation,
    statusFilters,
    hideVisited,
    hideSaved,
    hideHidden,
    hideWithoutImages,
    filterContacts,
    personalMinRating,
    contactMinRating,
    selectedArchitects,
    selectedCollections,
    selectedCategory,
    selectedTypologies,
    selectedAttributes,
    selectedContacts,
    viewMode,
    setViewMode,
    availableCollections,
    setStatusFilters,
    setHideVisited,
    setHideSaved,
    setHideHidden,
    setHideWithoutImages,
    setFilterContacts,
    setPersonalMinRating,
    setContactMinRating,
    setSelectedArchitects,
    setSelectedCollections,
    setSelectedCategory,
    setSelectedTypologies,
    setSelectedAttributes,
    setSelectedContacts,
  } = useBuildingSearch();

  // State for highlighted building
  const [highlightedBuildingId, setHighlightedBuildingId] = useState<string | null>(null);
  const [searchTriggerVersion, setSearchTriggerVersion] = useState(0);

  // Refs for managing programmatic moves and region updates
  const regionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userHasMovedMap = useRef(false);
  const isProgrammaticMove = useRef(false);
  const programmaticMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active filter signature for debugging
  const activeFilterSignature = useMemo(() => {
    return JSON.stringify({
      searchQuery,
      statusFilters,
      hideVisited,
      hideSaved,
      hideHidden,
      hideWithoutImages,
      filterContacts,
      personalMinRating,
      contactMinRating,
      selectedArchitects,
      selectedCollections,
      selectedCategory,
      selectedTypologies,
      selectedAttributes,
      selectedContacts
    });
  }, [
    searchQuery,
    statusFilters,
    hideVisited,
    hideSaved,
    hideHidden,
    hideWithoutImages,
    filterContacts,
    personalMinRating,
    contactMinRating,
    selectedArchitects,
    selectedCollections,
    selectedCategory,
    selectedTypologies,
    selectedAttributes,
    selectedContacts
  ]);

  useEffect(() => {
    debug.log('🔍 [FILTERS] Signature Changed:', JSON.parse(activeFilterSignature));
  }, [activeFilterSignature]);

  // Buildings are already validated by the refactored hook
  // This is a safety net for edge cases
  const safeBuildings = useMemo(() => {
    if (!buildings) return [];
    // The hook already validates, but we double-check for safety
    return buildings.filter(b =>
      !!b.id &&
      typeof b.location_lat === 'number' &&
      typeof b.location_lng === 'number' &&
      !isNaN(b.location_lat) &&
      !isNaN(b.location_lng)
    );
  }, [buildings]);

  // Derived state to control map behavior
  const searchMode = searchQuery ? 'global' : 'explore';

  // Mutation for updating building status
  const { mutate: updateBuildingStatus } = useMutation({
    mutationFn: async ({ 
      buildingId, 
      status 
    }: { 
      buildingId: string; 
      status: 'pending' | 'visited' | 'hidden' 
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_buildings')
        .upsert({
          user_id: user.id,
          building_id: buildingId,
          status: status
        }, {
          onConflict: 'user_id,building_id'
        });

      if (error) throw error;
    },
    onError: (error) => {
      debug.error('Failed to update building status:', error);
    }
  });

  /**
   * Handle region changes from map interactions
   * Only updates location in explore mode and ignores programmatic moves
   */
  const handleRegionChange = useCallback((center: { lat: number; lng: number }) => {
    // Ignore updates triggered by programmatic moves (e.g., list clicks)
    if (isProgrammaticMove.current) {
      debug.log('🛡️ [GUARD] Ignoring region change due to programmatic move');
      return;
    }

    if (searchMode === 'explore') {
      if (regionUpdateTimeoutRef.current) {
        clearTimeout(regionUpdateTimeoutRef.current);
      }
      
      regionUpdateTimeoutRef.current = setTimeout(() => {
        updateLocation(center);
      }, REGION_UPDATE_DELAY);
    }
  }, [searchMode, updateLocation]);

  /**
   * Track when user manually interacts with map
   */
  const handleMapInteraction = useCallback(() => {
    userHasMovedMap.current = true;
  }, []);

  /**
   * Auto-fit map bounds when search query changes
   */
  useEffect(() => {
    if (searchQuery && !userHasMovedMap.current && safeBuildings.length > 0) {
      const bounds = getBoundsFromBuildings(safeBuildings);
      if (bounds && mapRef.current) {
        if (typeof bounds.north === 'number' && typeof bounds.east === 'number') {
          mapRef.current.fitBounds(bounds);
        }
      }
    }
  }, [searchQuery, safeBuildings]);

  /**
   * Reset interaction flag and increment trigger when search changes
   */
  useEffect(() => {
    if (searchQuery) {
      setSearchTriggerVersion(prev => prev + 1);
      userHasMovedMap.current = false;
    }
  }, [searchQuery]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (regionUpdateTimeoutRef.current) {
        clearTimeout(regionUpdateTimeoutRef.current);
      }
      if (programmaticMoveTimeoutRef.current) {
        clearTimeout(programmaticMoveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handler for list item click - fly to building on map
   */
  const handleListHighlight = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) {
      debug.warn('[SearchPage] Map ref not available');
      return;
    }

    debug.log('👆 [LIST] Programmatic move:', lat, lng);
    isProgrammaticMove.current = true;

    try {
      mapRef.current.flyTo({ lat, lng }, FLY_TO_ZOOM);
    } catch (err) {
      debug.error('💥 [Map] flyTo failed:', err);
      isProgrammaticMove.current = false;
      return;
    }

    // Clear any existing timeout
    if (programmaticMoveTimeoutRef.current) {
      clearTimeout(programmaticMoveTimeoutRef.current);
    }

    programmaticMoveTimeoutRef.current = setTimeout(() => { 
      isProgrammaticMove.current = false;
    }, PROGRAMMATIC_MOVE_DURATION);
  }, []);

  /**
   * Adapter for building click - validates coordinates and triggers highlight
   */
  const onBuildingClickAdapter = useCallback((building: DiscoveryBuilding) => {
    if (typeof building.location_lat === 'number' && 
        typeof building.location_lng === 'number' &&
        !isNaN(building.location_lat) &&
        !isNaN(building.location_lng)) {
      
      setHighlightedBuildingId(building.id);
      handleListHighlight(building.location_lat, building.location_lng);
      
      if (isMobile) {
        setViewMode('map');
      }
    } else {
      debug.warn('⚠️ [SearchPage] Invalid coordinates for building:', building.id);
    }
  }, [handleListHighlight, isMobile, setViewMode]);

  /**
   * Building interaction handlers
   */
  const handleSave = useCallback((buildingId: string) => {
    updateBuildingStatus({ buildingId, status: 'pending' });
  }, [updateBuildingStatus]);

  const handleVisit = useCallback((buildingId: string) => {
    updateBuildingStatus({ buildingId, status: 'visited' });
  }, [updateBuildingStatus]);

  const handleHide = useCallback((buildingId: string) => {
    updateBuildingStatus({ buildingId, status: 'hidden' });
  }, [updateBuildingStatus]);

  const handleMarkerClick = useCallback((buildingId: string) => {
    setHighlightedBuildingId(buildingId);
  }, []);

  const handleClosePopup = useCallback(() => {
    setHighlightedBuildingId(null);
  }, []);

  const handleLocationSelect = useCallback((location: { lat: number; lng: number }) => {
    updateLocation(location);
    if (mapRef.current) {
      mapRef.current.flyTo(location, 14);
    }
  }, [updateLocation]);

  const searchInput = (
    <div className="flex gap-2">
      <DiscoverySearchInput
        value={searchQuery}
        onSearchChange={setSearchQuery}
        onLocationSelect={handleLocationSelect}
        placeholder="Search buildings or places..."
        className="flex-1"
      />
      <SearchFilters
        statusFilters={statusFilters}
        setStatusFilters={setStatusFilters}
        hideVisited={hideVisited}
        setHideVisited={setHideVisited}
        hideSaved={hideSaved}
        setHideSaved={setHideSaved}
        hideHidden={hideHidden}
        setHideHidden={setHideHidden}
        hideWithoutImages={hideWithoutImages}
        setHideWithoutImages={setHideWithoutImages}
        personalMinRating={personalMinRating}
        setPersonalMinRating={setPersonalMinRating}
        contactMinRating={contactMinRating}
        setContactMinRating={setContactMinRating}
        filterContacts={filterContacts}
        setFilterContacts={setFilterContacts}
        selectedContacts={selectedContacts}
        setSelectedContacts={setSelectedContacts}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedTypologies={selectedTypologies}
        setSelectedTypologies={setSelectedTypologies}
        selectedAttributes={selectedAttributes}
        setSelectedAttributes={setSelectedAttributes}
        selectedArchitects={selectedArchitects}
        setSelectedArchitects={setSelectedArchitects}
        selectedCollections={selectedCollections}
        setSelectedCollections={setSelectedCollections}
        availableCollections={availableCollections}
      />
    </div>
  );

  return (
    <AppLayout
      isFullScreen={true}
      showHeader={true}
      showNav={false}
      variant="map"
      searchBar={searchInput}
    >
      <div
        data-testid="search-page-wrapper"
        className={`relative flex flex-col h-full transition-all duration-300 ease-in-out`}
      >
        {/* Desktop List Sidebar */}
        <ListSidebar
          buildings={safeBuildings}
          isLoading={isLoading}
          onBuildingClick={onBuildingClickAdapter}
          searchQuery={searchQuery}
          className="hidden md:block w-[400px] bg-white border-r border-gray-200 overflow-y-auto h-full absolute left-0 top-0 z-[5] shadow-lg"
          header={searchInput}
        />

        {/* Mobile View Toggle */}
        {isMobile && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
            <Button
              onClick={() => setViewMode(prev => prev === 'map' ? 'list' : 'map')}
              className="rounded-full shadow-lg"
              variant="secondary"
              aria-label={viewMode === 'map' ? 'Show list view' : 'Show map view'}
            >
              {viewMode === 'map' ? (
                <>
                  <ListIcon className="mr-2 h-4 w-4" />
                  List
                </>
              ) : (
                <>
                  <MapIcon className="mr-2 h-4 w-4" />
                  Map
                </>
              )}
            </Button>
          </div>
        )}

        {/* Mobile List View (Overlay) */}
        {isMobile && viewMode === 'list' && (
          <ListSidebar
            buildings={safeBuildings}
            isLoading={isLoading}
            onBuildingClick={onBuildingClickAdapter}
            searchQuery={searchQuery}
            className="absolute inset-0 bg-white z-40 overflow-y-auto pb-20"
          />
        )}

        {/* Map Container */}
        <div 
          className={`flex-1 relative h-full transition-all duration-300 ${
            isMobile ? 'w-full' : 'md:ml-[400px] w-full'
          }`}
        >
          <ErrorBoundary FallbackComponent={MapErrorFallback}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  <p className="mt-4 text-sm text-gray-600">Loading map...</p>
                </div>
              </div>
            }>
              <BuildingDiscoveryMap
                ref={mapRef}
                externalBuildings={safeBuildings}
                onRegionChange={handleRegionChange}
                onBoundsChange={() => {}}
                onMapInteraction={handleMapInteraction}
                isFetching={isFetching}
                autoZoomOnLowCount={!userHasMovedMap.current && searchQuery.length > 0}
                resetInteractionTrigger={searchTriggerVersion}
                highlightedId={highlightedBuildingId}
                onMarkerClick={handleMarkerClick}
                showImages={true}
                onSave={handleSave}
                onVisit={handleVisit}
                onHide={handleHide}
                onClosePopup={handleClosePopup}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </AppLayout>
  );
}
