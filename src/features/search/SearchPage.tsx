import { lazy, Suspense, useRef } from "react";
import type { BuildingDiscoveryMapRef } from "@/components/common/BuildingDiscoveryMap";

const BuildingDiscoveryMap = lazy(() => import("@/components/common/BuildingDiscoveryMap").then(module => ({ default: module.BuildingDiscoveryMap })));

export default function SearchPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MOCK_BUILDINGS: any[] = [
     { id: '1', name: 'Mock Building A', location_lat: 51.505, location_lng: -0.09, main_image_url: null, status: 'completed' },
     { id: '2', name: 'Mock Building B', location_lat: 51.51, location_lng: -0.1, main_image_url: null, status: 'completed' },
     { id: '3', name: 'Mock Building C', location_lat: 51.515, location_lng: -0.09, main_image_url: null, status: 'completed' },
   ];

  const mapRef = useRef<BuildingDiscoveryMapRef | null>(null);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f0f0f0' }}>
       {/* Pure Map. No Sidebars. No Layouts. */}
       <Suspense fallback={<div>Loading...</div>}>
         <BuildingDiscoveryMap
            ref={mapRef}
            externalBuildings={MOCK_BUILDINGS}
            onRegionChange={() => {}}
            onBoundsChange={() => {}}
            onMapInteraction={() => {}}
            isLoading={false}
            isFetching={false}
         />
       </Suspense>
    </div>
  );
}
