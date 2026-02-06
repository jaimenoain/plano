import { lazy, Suspense, useRef, useEffect, useMemo, useCallback } from "react";
import type { BuildingDiscoveryMapRef } from "@/components/common/BuildingDiscoveryMap";
import { useSidebar } from "@/components/ui/sidebar";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useBuildingSearch } from "./hooks/useBuildingSearch";
import { getBoundsFromBuildings } from "@/utils/map";

const BuildingDiscoveryMap = lazy(() => import("@/components/common/BuildingDiscoveryMap").then(module => ({ default: module.BuildingDiscoveryMap })));

export default function SearchPage() {
  const mapRef = useRef<BuildingDiscoveryMapRef | null>(null);
  const { state, isMobile } = useSidebar();
  useAuth();

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
             mapRef.current.fitBounds(bounds);
        }
     }
  }, [searchQuery, safeBuildings]);

  return (
    <AppLayout isFullScreen={true} showHeader={false} showNav={false}>
     <div
       data-testid="search-page-wrapper"
       style={{
         marginLeft: state === "expanded" && !isMobile ? "calc(var(--sidebar-width) - var(--sidebar-width-icon))" : "0",
         transition: "margin-left 0.2s linear",
         width: "auto",
         height: "100vh"
       }}
     >
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
    </AppLayout>
  );
}
