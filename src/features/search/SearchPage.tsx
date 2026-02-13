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

const SIDEBAR_EXPANDED_OFFSET = 208; // Approx 13rem

function SearchPageContent() {
  const { state, isMobile } = useSidebar();
  const isSidebarExpanded = state === 'expanded' && !isMobile;

  const {
    state: { filters },
    methods: { setFilter, moveMap }
  } = useMapContext();

  // Local search state
  const [searchValue, setSearchValue] = useState(filters.query || "");
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // View mode state (map vs list) for mobile
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');

  // Top location suggestion state
  const [topLocation, setTopLocation] = useState<{ description: string; place_id: string } | null>(null);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query]);

  // Handlers
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    moveMap(location.lat, location.lng, 14); // Zoom to 14 on select
    if (isMobile) {
        setViewMode('map');
    }
  };

  const handleLocationResultClick = async (placeId: string) => {
    try {
      const results = await getGeocode({ placeId });
      const { lat, lng } = await getLatLng(results[0]);
      handleLocationSelect({ lat, lng });
      setSearchValue(""); // Clear search value
    } catch (error) {
      console.error("Geocoding error: ", error);
    }
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'map' ? 'list' : 'map');
  };

  return (
    <AppLayout
      isFullScreen={true}
      showHeader={false}
      showNav={false}
      variant="map"
    >
      <div className="relative flex flex-col h-full w-full overflow-hidden">

        {/* Mobile Search Header */}
        {isMobile && (
           <div className="z-50 p-4 bg-background border-b shrink-0">
              <DiscoverySearchInput
                value={searchValue}
                onSearchChange={handleSearchChange}
                onLocationSelect={handleLocationSelect}
                onTopLocationChange={setTopLocation}
                placeholder="Search..."
                className="w-full"
                dropdownMode="relative"
              />
           </div>
        )}

        <div className="flex-1 relative w-full overflow-hidden">
          {/* Desktop Sidebar (Fixed) */}
          <div
              className={`hidden md:flex flex-col w-[400px] bg-background border-r border-border absolute top-0 bottom-0 z-20 shadow-lg transition-all duration-300`}
              style={{ left: isSidebarExpanded ? SIDEBAR_EXPANDED_OFFSET : 0 }}
          >
             <div className="p-4 border-b space-y-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <DiscoverySearchInput
                   value={searchValue}
                   onSearchChange={handleSearchChange}
                   onLocationSelect={handleLocationSelect}
                   onTopLocationChange={setTopLocation}
                   placeholder="Search buildings, architects..."
                   className="w-full"
                />
                <MapControls />
             </div>
             <div className="flex-1 overflow-hidden relative">
                <BuildingSidebar
                  topLocation={topLocation}
                  onLocationClick={handleLocationResultClick}
                />
             </div>
          </div>

          {/* Map Container (Main) */}
          <div
            className={`flex-1 h-full relative transition-all duration-300`}
            style={{
              marginLeft: isMobile ? 0 : 400 + (isSidebarExpanded ? SIDEBAR_EXPANDED_OFFSET : 0)
            }}
          >
             <PlanoMap />
          </div>

          {/* Mobile Toggle Button */}
          {isMobile && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
              <Button
                onClick={toggleViewMode}
                className="rounded-full shadow-lg h-12 px-6"
                variant="default"
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

          {/* Mobile List Overlay */}
          {isMobile && viewMode === 'list' && (
             <div className="absolute inset-0 bg-background z-40 flex flex-col animate-in slide-in-from-bottom-10 duration-200">
                <div className="p-4 border-b space-y-3">
                   <MapControls />
                </div>
                <div className="flex-1 overflow-hidden relative pb-20">
                   <BuildingSidebar
                      topLocation={topLocation}
                      onLocationClick={handleLocationResultClick}
                   />
                </div>
             </div>
          )}
        </div>

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
