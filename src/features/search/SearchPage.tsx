import { lazy, Suspense, useRef, useEffect, useMemo, useCallback, useState } from "react";
import type { BuildingDiscoveryMapRef } from "@/components/common/BuildingDiscoveryMap";
import { useSidebar } from "@/components/ui/sidebar";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useBuildingSearch } from "./hooks/useBuildingSearch";
import { getBoundsFromBuildings } from "@/utils/map";
import { DiscoveryList } from "./components/DiscoveryList";
import { DiscoveryBuilding } from "./components/types";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, List as ListIcon } from "lucide-react";

const BuildingDiscoveryMap = lazy(() => import("@/components/common/BuildingDiscoveryMap").then(module => ({ default: module.BuildingDiscoveryMap })));

export default function SearchPage() {
  const mapRef = useRef<BuildingDiscoveryMapRef | null>(null);
  const { state, isMobile } = useSidebar();
  useAuth();

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const {
    buildings,
    isLoading,
    isFetching,
    searchQuery,
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
    selectedContacts
  } = useBuildingSearch();

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
    // Log only when the signature actually changes to detect loops
    console.log('🔍 [FILTERS] Signature Changed/Stable:', JSON.parse(activeFilterSignature));
  }, [activeFilterSignature]);

  const safeBuildings = useMemo(() => {
    if (!buildings) return [];
    return buildings.filter(b =>
      typeof b.location_lat === 'number' &&
      typeof b.location_lng === 'number' &&
      !isNaN(b.location_lat) &&
      !isNaN(b.location_lng)
    );
  }, [buildings]);

  // Derived state to control map behavior
  const searchMode = searchQuery ? 'global' : 'explore';

  const regionUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userHasMovedMap = useRef(false);
  const isProgrammaticMove = useRef(false);

  const handleRegionChange = useCallback((center: { lat: number; lng: number }) => {
    // GUARD: Ignore updates triggered by our own code (e.g. list clicks)
    if (isProgrammaticMove.current) {
      console.log('🛡️ [GUARD] Ignoring region change due to programmatic move.');
      return;
    }

    if (searchMode === 'explore') {
      if (regionUpdateTimeoutRef.current) clearTimeout(regionUpdateTimeoutRef.current);
      regionUpdateTimeoutRef.current = setTimeout(() => {
        updateLocation(center);
      }, 500);
    }
  }, [searchMode, updateLocation]);

  const handleMapInteraction = useCallback(() => {
    userHasMovedMap.current = true;
  }, []);

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

  // Handler for List Item Click (The Shield Logic)
  const handleListHighlight = useCallback((lat: any, lng: any) => { // Type as any to catch runtime errors
      // STRICT SAFETY CHECK
      const safeLat = parseFloat(lat);
      const safeLng = parseFloat(lng);

      if (isNaN(safeLat) || isNaN(safeLng) || !mapRef.current) {
         console.warn('⚠️ [SearchPage] Invalid coordinates passed to highlight:', lat, lng);
         return;
      }

      console.log('point_up [LIST] Programmatic move:', safeLat, safeLng);
      isProgrammaticMove.current = true;

      try {
        mapRef.current.flyTo({ lat: safeLat, lng: safeLng, zoom: 16 });
      } catch (err) {
        console.error('💥 [Map] flyTo failed:', err);
      }

      setTimeout(() => { isProgrammaticMove.current = false; }, 1500);
   }, []);

  // const onBuildingClickAdapter = useCallback((building: DiscoveryBuilding) => {
  //   if (typeof building.location_lat === 'number' && typeof building.location_lng === 'number') {
  //     handleListHighlight(building.location_lat, building.location_lng);
  //     if (isMobile) {
  //       setViewMode('map');
  //     }
  //   }
  // }, [handleListHighlight, isMobile]);

  return (
    <AppLayout isFullScreen={true} showHeader={false} showNav={false}>
     <div
       data-testid="search-page-wrapper"
       className={`relative flex flex-col h-full transition-all duration-300 ease-in-out ${
         isMobile ? 'ml-0' : 'md:ml-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]'
       }`}
       style={{
         // Manual fallback if tailwind calc fails or for specific layout needs
         marginLeft: state === "expanded" && !isMobile ? "calc(var(--sidebar-width) - var(--sidebar-width-icon))" : undefined,
       }}
     >
        {/* Desktop List Sidebar */}
        <div className="hidden md:block w-[400px] bg-white border-r border-gray-200 overflow-y-auto h-full absolute left-0 top-0 z-10 shadow-lg">
           <DiscoveryList
              buildings={safeBuildings}
              isLoading={isLoading}
              onBuildingClick={undefined}
              searchQuery={searchQuery}
            />
        </div>

        {/* Mobile View Toggle */}
        {isMobile && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
            <Button
              onClick={() => setViewMode(prev => prev === 'map' ? 'list' : 'map')}
              className="rounded-full shadow-lg"
              variant="secondary"
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
          <div className="absolute inset-0 bg-white z-40 overflow-y-auto pt-16 pb-20">
             <DiscoveryList
                buildings={safeBuildings}
                isLoading={isLoading}
                onBuildingClick={undefined}
                searchQuery={searchQuery}
              />
          </div>
        )}

        {/* Map Container */}
        <div className="flex-1 relative h-full w-full">
         <Suspense fallback={<div>Loading...</div>}>
           <BuildingDiscoveryMap
              ref={mapRef}
              externalBuildings={safeBuildings}
              onRegionChange={handleRegionChange}
              onBoundsChange={() => {}}
              onMapInteraction={handleMapInteraction}
              isLoading={isLoading}
              isFetching={isFetching}
           />
         </Suspense>
        </div>
      </div>
    </AppLayout>
  );
}
