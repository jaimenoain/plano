import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { BuildingDiscoveryMap, MapRef } from "@/components/common/BuildingDiscoveryMap";
import { DiscoveryList } from "./components/DiscoveryList";
import { useBuildingSearch } from "./hooks/useBuildingSearch";
import { useUserLocation } from "@/hooks/useUserLocation";
import { Loader2, Map as MapIcon, List as ListIcon } from "lucide-react";
import { DiscoverySearchInput } from "./components/DiscoverySearchInput";
import { FilterDrawerContent } from "@/components/common/FilterDrawerContent";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SearchModeToggle } from "./components/SearchModeToggle";
import { ArchitectResultsList } from "./components/ArchitectResultsList";
import { UserResultsList } from "./components/UserResultsList";
import { ArchitectSearchNudge } from "./components/ArchitectSearchNudge";
import { UserSearchNudge } from "./components/UserSearchNudge";
import { useDebounce } from "@/hooks/useDebounce";

// Helper to calculate bounds (same as before)
const calculateBounds = (buildings: any[]) => {
  if (!buildings?.length) return null;
  const targetBuildings = buildings.slice(0, 5); // Focus on top 5
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  let validCoords = false;

  targetBuildings.forEach(b => {
    const lat = b.location?.lat || b.lat;
    const lng = b.location?.lng || b.lng;
    if (lat !== 0 && lng !== 0 && lat && lng) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      validCoords = true;
    }
  });

  if (!validCoords) return null;
  return [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]];
};

export default function SearchPage() {
  // --- 1. Global State & Hooks ---
  const { isMobile } = useSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapRef = useRef<MapRef>(null);
  
  // Search Mode State
  const currentMode = (searchParams.get("mode") as "buildings" | "architects" | "users") || "buildings";
  const [searchMode, setSearchMode] = useState<"buildings" | "architects" | "users">(currentMode);

  // Search Term State
  const initialQuery = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // --- 2. The "Ghost Movement" Fix: Request Versioning ---
  const [searchTriggerVersion, setSearchTriggerVersion] = useState(1);
  const lastHandledVersionRef = useRef(0);

  // --- 3. UI State ---
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // --- 4. Data Fetching ---
  const { 
    buildings = [],
    isLoading, 
    isFetching, 
    isPlaceholderData, 
    totalCount 
  } = useBuildingSearch({
    searchTriggerVersion, // Critical: Binds data to explicit user actions
    term: debouncedSearchTerm, // Pass search term
    mode: searchMode // Pass mode
  });

  // --- 5. Handlers ---
  
  // Sync URL with Search Term
  useEffect(() => {
    setSearchParams(prev => {
      if (debouncedSearchTerm) prev.set("q", debouncedSearchTerm);
      else prev.delete("q");
      prev.set("mode", searchMode);
      return prev;
    }, { replace: true });
  }, [debouncedSearchTerm, searchMode, setSearchParams]);

  // Handle Input Changes (Increments Version)
  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
    setSearchTriggerVersion(v => v + 1); // Explicit action -> Increment Version
  }, []);

  // Handle Mode Changes
  const handleModeChange = (mode: "buildings" | "architects" | "users") => {
    setSearchMode(mode);
    setSearchTriggerVersion(v => v + 1); // Mode switch is an explicit action
  };

  const handleFilterChange = useCallback(() => {
    setSearchTriggerVersion(v => v + 1); // Filter change is an explicit action
  }, []);

  // --- 6. Map Camera Effect (The Logic Fix) ---
  useEffect(() => {
    // Only run if we are in 'buildings' mode
    if (searchMode !== 'buildings') return;

    // PRE-CONDITION: Data is settled and valid
    if (!isFetching && !isLoading && !isPlaceholderData && buildings?.length > 0) {
      
      // GUARD: Only move if version is new (User Action), NOT on Panning (Implicit)
      if (searchTriggerVersion > lastHandledVersionRef.current) {
        lastHandledVersionRef.current = searchTriggerVersion;

        const bounds = calculateBounds(buildings);
        if (bounds && mapRef.current) {
          mapRef.current.fitBounds(bounds, {
            padding: isMobile ? { top: 120, bottom: 20, left: 20, right: 20 } : { top: 100, bottom: 100, left: 450, right: 100 },
            duration: 1200
          });
        }
      }
    }
  }, [buildings, isFetching, isLoading, isPlaceholderData, searchTriggerVersion, isMobile, searchMode]);


  // --- 7. Conditional Rendering Helpers ---

  // Render NON-Building Modes (Architects / Users) - simpler list views
  if (searchMode === "architects") {
    return (
      <div className="h-full w-full bg-background flex flex-col">
        <div className="p-4 border-b space-y-4">
          <DiscoverySearchInput value={searchTerm} onSearch={handleSearchTermChange} />
          <SearchModeToggle currentMode={searchMode} onModeChange={handleModeChange} />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ArchitectResultsList searchTerm={debouncedSearchTerm} />
        </div>
      </div>
    );
  }

  if (searchMode === "users") {
    return (
      <div className="h-full w-full bg-background flex flex-col">
        <div className="p-4 border-b space-y-4">
          <DiscoverySearchInput value={searchTerm} onSearch={handleSearchTermChange} />
          <SearchModeToggle currentMode={searchMode} onModeChange={handleModeChange} />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <UserResultsList searchTerm={debouncedSearchTerm} />
        </div>
      </div>
    );
  }

  // --- 8. BUILDINGS MODE (The Complex Map View) ---
  // We explicitly branch Mobile vs Desktop here to prevent Double Mounting

  const SearchHeader = () => (
    <div className="pointer-events-auto flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <DiscoverySearchInput value={searchTerm} onSearch={handleSearchTermChange} className="flex-1 shadow-lg" />
        <Button variant="secondary" size="icon" className="shadow-lg shrink-0" onClick={() => setIsFilterOpen(true)}>
          <ListIcon className="h-4 w-4" />
        </Button>
      </div>
      {/* Only show Toggle if searching, otherwise maybe hide to save space? preserving original logic */}
      <div className="bg-background/90 backdrop-blur rounded-lg shadow-sm">
         <SearchModeToggle currentMode={searchMode} onModeChange={handleModeChange} />
      </div>
    </div>
  );

  // === MOBILE LAYOUT ===
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] w-full relative bg-background">
        
        {/* Mobile Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none pb-12">
          <SearchHeader />
        </div>

        {/* Floating View Switcher */}
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

        {/* Main Content */}
        <div className="flex-1 relative overflow-hidden">
          {/* List View (Slide-over) */}
          <div 
            className={`absolute inset-0 bg-background transition-transform duration-300 z-10 ${
              mobileView === "list" ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="h-full overflow-y-auto p-4 pt-32 pb-24">
              <h2 className="text-lg font-semibold mb-4">
                {totalCount > 0 ? `${totalCount} Results` : 'Explore Buildings'}
              </h2>
              <DiscoveryList buildings={buildings} isLoading={isLoading} />
              
              {/* Nudges */}
              {!isLoading && (
                <div className="mt-8 space-y-4">
                  <ArchitectSearchNudge onSearchArchitects={() => handleModeChange("architects")} />
                  <UserSearchNudge onSearchUsers={() => handleModeChange("users")} />
                </div>
              )}
            </div>
          </div>

          {/* Map View - Single Source of Truth: ONLY mounts if isMobile is true */}
          <div className="absolute inset-0 w-full h-full">
             <BuildingDiscoveryMap
                ref={mapRef}
                buildings={buildings}
                showUserLocation={true}
                className="w-full h-full"
             />
          </div>
        </div>

        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
            <FilterDrawerContent onApply={() => { handleFilterChange(); setIsFilterOpen(false); }} />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // === DESKTOP LAYOUT ===
  return (
    <div className="grid grid-cols-12 h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      
      {/* Left Sidebar */}
      <div className="col-span-4 lg:col-span-3 border-r h-full flex flex-col bg-card relative z-20 shadow-xl">
        <div className="p-4 border-b space-y-4">
          <h1 className="text-xl font-bold">Discover</h1>
          <DiscoverySearchInput value={searchTerm} onSearch={handleSearchTermChange} />
          <SearchModeToggle currentMode={searchMode} onModeChange={handleModeChange} />
          
          <div className="flex gap-2">
             <Button variant="outline" size="sm" className="w-full" onClick={() => setIsFilterOpen(true)}>
               Filters {isFetching ? <Loader2 className="ml-2 h-3 w-3 animate-spin" /> : null}
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

          {/* Nudges */}
          {!isLoading && (
            <div className="mt-8 space-y-4">
              <ArchitectSearchNudge onSearchArchitects={() => handleModeChange("architects")} />
              <UserSearchNudge onSearchUsers={() => handleModeChange("users")} />
            </div>
          )}
        </div>
      </div>

      {/* Right Map Area - Single Source of Truth: Only mounts in desktop branch */}
      <div className="col-span-8 lg:col-span-9 h-full relative">
        <BuildingDiscoveryMap
          ref={mapRef}
          buildings={buildings}
          showUserLocation={true}
          className="w-full h-full"
        />
        
        {isFetching && (
          <div className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 text-sm font-medium animate-in fade-in">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Updating...
          </div>
        )}
      </div>

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="right" className="w-[400px]">
          <FilterDrawerContent onApply={() => { handleFilterChange(); setIsFilterOpen(false); }} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
