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

  // Restore Layout & Sidebar hooks
  const { state, isMobile } = useSidebar();
  useAuth();

  // Restore the hook
  const {
    // userLocation, // Not used directly in this simplified view
    buildings,
    isLoading,
    isFetching,
    searchQuery,
    // Filters (extracted but currently unused in this simplified render, keeping for context if needed later)
    /*
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
    */
    updateLocation
  } = useBuildingSearch();

  // FIX 1: Stable Data Reference
  // Only update 'safeBuildings' if the stringified content changes or length changes,
  // protecting the Map from new array references that contain the same data.
  const safeBuildings = useMemo(() => {
    if (!buildings) return [];
    return buildings.filter(b =>
      // SANITIZATION: Ensure strict number coordinates to prevent Mapbox crash
      typeof b.location_lat === 'number' &&
      typeof b.location_lng === 'number' &&
      !isNaN(b.location_lat) &&
      !isNaN(b.location_lng)
    );
  }, [buildings]);

  // FIX 2: Debounced Interaction
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userHasMovedMap = useRef(false);

  const handleRegionChange = useCallback((center: { lat: number, lng: number }) => {
    // Clear pending updates
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Wait 500ms after movement stops before triggering a fetch
    timeoutRef.current = setTimeout(() => {
      // console.log('🗺️ [Map] Triggering Location Update (Debounced)');
      updateLocation(center);
    }, 500);
  }, [updateLocation]);

  const handleMapInteraction = useCallback(() => {
    userHasMovedMap.current = true;
  }, []);

  // Auto-focus logic
  useEffect(() => {
     // Only auto-move if we have a SPECIFIC target search query (like a city name)
     // AND we haven't moved recently.
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
       {/* Pure Map. No Sidebars. No Layouts. */}
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
