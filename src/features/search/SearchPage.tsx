import { lazy, Suspense, useRef, useEffect, useMemo } from "react";
import type { BuildingDiscoveryMapRef } from "@/components/common/BuildingDiscoveryMap";
import { useSidebar } from "@/components/ui/sidebar";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useBuildingSearch } from "./hooks/useBuildingSearch";

const BuildingDiscoveryMap = lazy(() => import("@/components/common/BuildingDiscoveryMap").then(module => ({ default: module.BuildingDiscoveryMap })));

export default function SearchPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MOCK_BUILDINGS: any[] = [
     { id: '1', name: 'Mock Building A', location_lat: 51.505, location_lng: -0.09, main_image_url: null, status: 'completed' },
     { id: '2', name: 'Mock Building B', location_lat: 51.51, location_lng: -0.1, main_image_url: null, status: 'completed' },
     { id: '3', name: 'Mock Building C', location_lat: 51.515, location_lng: -0.09, main_image_url: null, status: 'completed' },
   ];

  const mapRef = useRef<BuildingDiscoveryMapRef | null>(null);

  // Restore Layout & Sidebar hooks
  const { state, isMobile } = useSidebar();
  useAuth();

  // Restore the hook
  const {
    userLocation,
    buildings,
    isLoading,
    isFetching,
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
  } = useBuildingSearch();

  const activeFilterSignature = useMemo(() => {
    return JSON.stringify({
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

   // --- DIAGNOSTIC TRAP START ---
   useEffect(() => {
      console.log('🔥 [RENDER] SearchPage Component Rendered at', new Date().toISOString());
   });

   // Monitor the main suspects returned by the hook
   useEffect(() => {
      console.log('⚠️ [HOOK] userLocation changed:', userLocation);
   }, [userLocation]);

   useEffect(() => {
      console.log('⚠️ [HOOK] buildings array reference changed (Length: ' + buildings?.length + ')');
   }, [buildings]);

   useEffect(() => {
      console.log('⚠️ [HOOK] searchQuery changed:', searchQuery);
   }, [searchQuery]);

   useEffect(() => {
      // Monitor the filter signature derived in the component
      console.log('⚠️ [PAGE] activeFilterSignature changed');
   }, [activeFilterSignature]);
   // --- DIAGNOSTIC TRAP END ---

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
            externalBuildings={buildings}
            onRegionChange={() => {}}
            onBoundsChange={() => {}}
            onMapInteraction={() => {}}
            isLoading={isLoading}
            isFetching={isFetching}
         />
       </Suspense>
      </div>
    </AppLayout>
  );
}
