import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { BuildingDiscoveryMap, MapRef } from "@/components/common/BuildingDiscoveryMap";
import { DiscoveryList } from "./components/DiscoveryList";
import { useBuildingSearch } from "./hooks/useBuildingSearch";
import { useUserLocation } from "@/hooks/useUserLocation";
import { Loader2 } from "lucide-react";
import { DiscoverySearchInput } from "./components/DiscoverySearchInput";
import { FilterDrawerContent } from "@/components/common/FilterDrawerContent";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, List as ListIcon } from "lucide-react";

// Helper to calculate bounds for a set of buildings
const calculateBounds = (buildings: any[]) => {
  if (!buildings.length) return null;
  
  // Focus on top 5 most relevant results to avoid zooming out too far
  const targetBuildings = buildings.slice(0, 5);
  
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  let validCoords = false;

  targetBuildings.forEach(b => {
    const lat = b.location?.lat || b.lat;
    const lng = b.location?.lng || b.lng;
    
    // Strict 0,0 check
    if (lat !== 0 && lng !== 0 && lat && lng) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      validCoords = true;
    }
  });

  if (!validCoords) return null;

  // Add some padding
  return [
    [minLng, minLat], // Southwest
    [maxLng, maxLat]  // Northeast
  ] as [[number, number], [number, number]];
};

export default function SearchPage() {
  // 1. Core State & Hooks
  const { isMobile } = useSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userLocation } = useUserLocation();
  const mapRef = useRef<MapRef>(null);

  // 2. Request Versioning State
  // This counter increments ONLY when the user explicitly changes filters/search.
  // It effectively "signs" the request, allowing the map to know if a data update
  // is a response to a user command (move map) or just a background refresh (don't move).
  const [searchTriggerVersion, setSearchTriggerVersion] = useState(0);
  const lastHandledVersionRef = useRef(0);

  // 3. UI State
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 4. Data Fetching
  const { 
    buildings, 
    isLoading, 
    isFetching, 
    isPlaceholderData,
    totalCount 
  } = useBuildingSearch({
    searchTriggerVersion // Pass version to query key to force fresh cache on explicit search
  });

  // 5. Explicit Action Handlers (Increment Version)
  const handleSearchTermChange = useCallback(() => {
    setSearchTriggerVersion(v => v + 1);
  }, []);

  const handleFilterChange = useCallback(() => {
    setSearchTriggerVersion(v => v + 1);
  }, []);

  // 6. Map Camera Control Effect ( The "Ghost Movement" Fix )
  useEffect(() => {
    // PRE-CONDITION: Data must be settled (not loading), not placeholder, and have results.
    if (!isFetching && !isLoading && !isPlaceholderData && buildings?.length > 0) {
      
      // GUARD: Only move the camera if this data corresponds to a NEW explicit version.
      // If data updates due to panning (implicit), version won't change, and this block is skipped.
      if (searchTriggerVersion > lastHandledVersionRef.current) {
        lastHandledVersionRef.current = searchTriggerVersion;

        const bounds = calculateBounds(buildings);
        
        if (bounds && mapRef.current) {
          console.log(`[SearchPage] Moving map to version ${searchTriggerVersion}`, bounds);
          mapRef.current.fitBounds(bounds, {
            padding: isMobile ? { top: 120, bottom: 20, left: 20, right: 20 } : { top: 100, bottom: 100, left: 450, right: 100 },
            duration: 1200
          });
        }
      }
    }
  }, [buildings, isFetching, isLoading, isPlaceholderData, searchTriggerVersion, isMobile]);


  // 7. Render Logic - STRICT SEPARATION
  
  // --- MOBILE LAYOUT ---
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] w-full relative bg-background">
        
        {/* Mobile Header / Search */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="pointer-events-auto flex gap-2">
            <DiscoverySearchInput 
              onSearch={handleSearchTermChange} 
              className="flex-1 shadow-lg"
            />
            <Button 
              variant="secondary" 
              size="icon" 
              className="shadow-lg shrink-0"
              onClick={() => setIsFilterOpen(true)}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* View Switcher (Floating) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="flex bg-background/90 backdrop-blur-md rounded-full p-1 shadow-xl border">
            <Button
              variant={mobileView === "map" ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-6"
              onClick={() => setMobileView("map")}
            >
              <MapIcon className="h-4 w-4 mr-2" /> Map
            </Button>
            <Button
              variant={mobileView === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-6"
              onClick={() => setMobileView("list")}
            >
              <ListIcon className="h-4 w-4 mr-2" /> List
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* List View */}
          <div 
            className={`absolute inset-0 bg-background transition-transform duration-300 z-10 ${
              mobileView === "list" ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="h-full overflow-y-auto p-4 pb-24">
              <h2 className="text-lg font-semibold mb-4">
                {totalCount > 0 ? `${totalCount} Results` : 'Explore Buildings'}
              </h2>
              <DiscoveryList buildings={buildings} isLoading={isLoading} />
            </div>
          </div>

          {/* Map View - Only mounted if isMobile is true */}
          <div className="absolute inset-0 w-full h-full">
             <BuildingDiscoveryMap
                ref={mapRef}
                buildings={buildings}
                showUserLocation={true}
                className="w-full h-full"
             />
          </div>
        </div>

        {/* Filter Drawer */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
            <FilterDrawerContent 
              onApply={() => {
                handleFilterChange();
                setIsFilterOpen(false);
              }} 
            />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // --- DESKTOP LAYOUT ---
  return (
    <div className="grid grid-cols-12 h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      
      {/* Left Sidebar (Results) */}
      <div className="col-span-4 lg:col-span-3 border-r h-full flex flex-col bg-card relative z-20 shadow-xl">
        <div className="p-4 border-b space-y-4">
          <h1 className="text-xl font-bold">Discover</h1>
          <DiscoverySearchInput onSearch={handleSearchTermChange} />
          
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
             {/* Desktop Quick Filters or Chips could go here */}
             <Button variant="outline" size="sm" onClick={handleFilterChange}>
               Filters
             </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">
              {isLoading ? "Searching..." : `${totalCount || 0} locations found`}
            </span>
          </div>
          
          <DiscoveryList buildings={buildings} isLoading={isLoading} />
        </div>
      </div>

      {/* Right Map Area */}
      <div className="col-span-8 lg:col-span-9 h-full relative">
        <BuildingDiscoveryMap
          ref={mapRef}
          buildings={buildings}
          showUserLocation={true}
          className="w-full h-full"
        />
        
        {/* Desktop Loading Overlay */}
        {isFetching && (
          <div className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 text-sm font-medium animate-in fade-in">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Updating map...
          </div>
        )}
      </div>
    </div>
  );
}
