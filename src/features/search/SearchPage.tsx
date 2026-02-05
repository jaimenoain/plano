import { useState, useEffect, useMemo, lazy, Suspense, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DiscoveryList } from "./components/DiscoveryList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, ListFilter, Locate, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FilterDrawerContent } from "@/components/common/FilterDrawerContent";
import { LocationInput } from "@/components/ui/LocationInput";
import { SearchModeToggle } from "./components/SearchModeToggle";
import { useBuildingSearch } from "./hooks/useBuildingSearch";
import { LeaderboardDialog } from "./components/LeaderboardDialog";
import { DiscoveryBuilding } from "./components/types";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { useUserSearch } from "./hooks/useUserSearch";
import { UserSearchNudge } from "./components/UserSearchNudge";
import { UserResultsList } from "./components/UserResultsList";
import { useArchitectSearch } from "./hooks/useArchitectSearch";
import { ArchitectSearchNudge } from "./components/ArchitectSearchNudge";
import { ArchitectResultsList } from "./components/ArchitectResultsList";
import { getBoundsFromBuildings, Bounds } from "@/utils/map";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/sidebar";
import type { BuildingDiscoveryMapRef } from "@/components/common/BuildingDiscoveryMap";

export type SearchScope = 'content' | 'users' | 'architects';

const BuildingDiscoveryMap = lazy(() => import("@/components/common/BuildingDiscoveryMap").then(module => ({ default: module.BuildingDiscoveryMap })));

export default function SearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>('content');
  const [searchParams] = useSearchParams();

  // Filter UI State
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");

  const mapRef = useRef<BuildingDiscoveryMapRef | null>(null);
  const lastBoundsRef = useRef<Bounds | null>(null);
  const lastFlownLocationRef = useRef<{lat: number, lng: number} | null>(null);

  // Track if user is interacting to prevent auto-fit fighting
  const isInteractingRef = useRef(false);

  const handleMapInteraction = useCallback(() => {
      setSearchMode('explore');
      setShouldFitBounds(false);
      isInteractingRef.current = true;
  }, []);

  const setMapRef = useCallback((node: BuildingDiscoveryMapRef | null) => {
      mapRef.current = node;
  }, []);

  useEffect(() => {
    if (searchParams.get("open_filters") === "true") {
      setFilterSheetOpen(true);
    }
  }, [searchParams]);
   
  // 1. Existing hooks
  const {
    searchQuery, setSearchQuery,
    statusFilters, setStatusFilters,
    hideVisited, setHideVisited,
    hideSaved, setHideSaved,
    hideHidden, setHideHidden,
    hideWithoutImages, setHideWithoutImages,
    filterContacts, setFilterContacts,
    personalMinRating, setPersonalMinRating,
    contactMinRating, setContactMinRating,
    selectedArchitects, setSelectedArchitects,
    selectedCollections, setSelectedCollections,
    availableCollections,
    selectedCategory, setSelectedCategory,
    selectedTypologies, setSelectedTypologies,
    selectedAttributes, setSelectedAttributes,
    selectedContacts, setSelectedContacts,
    viewMode, setViewMode,
    userLocation, updateLocation,
    buildings, isLoading, isFetching,
    requestLocation, gpsLocation
  } = useBuildingSearch();

  // 2. New State (Merged Feature + Main)

  // Feature: User Search Integration
  const { users: foundUsers, isLoading: isUserSearchLoading } = useUserSearch({
    searchQuery,
    limit: searchScope === 'users' ? 20 : 5,
    enabled: searchQuery.length >= 3
  });

  const handleUserSingleMatch = (username: string) => {
    navigate(`/profile/${username}`);
  };

  const handleUserMultipleMatch = () => {
    setSearchScope('users');
  };

  // Feature: Architect Search Integration
  const { architects: foundArchitects, isLoading: isArchitectSearchLoading } = useArchitectSearch({
    searchQuery,
    limit: searchScope === 'architects' ? 20 : 5,
    enabled: searchQuery.length >= 3
  });

  const handleArchitectSingleMatch = (id: string) => {
    navigate(`/architect/${id}`);
  };

  const handleArchitectMultipleMatch = () => {
    setSearchScope('architects');
  };

  // Feature: Map Interaction controls
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);
  const [searchMode, setSearchMode] = useState<'global' | 'explore'>('explore');
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  const [mapInteractionResetTrigger, setMapInteractionResetTrigger] = useState(0);

  // Main: Filter controls
  const [sortBy, setSortBy] = useState<string>("distance");

  const hasActiveFilters =
    (statusFilters && statusFilters.length > 0) ||
    hideVisited ||
    hideSaved ||
    !hideHidden ||
    hideWithoutImages ||
    filterContacts ||
    (selectedContacts && selectedContacts.length > 0) ||
    (selectedArchitects && selectedArchitects.length > 0) ||
    (selectedCollections && selectedCollections.length > 0) ||
    personalMinRating > 0 ||
    contactMinRating > 0 ||
    !!selectedCategory ||
    selectedTypologies.length > 0 ||
    selectedAttributes.length > 0;

  // Create a stable signature for filters to prevent infinite loops in useEffect
  const activeFilterSignature = useMemo(() => {
    return JSON.stringify({
      q: searchQuery,
      sf: statusFilters,
      hv: hideVisited,
      hs: hideSaved,
      hwi: hideWithoutImages,
      fc: filterContacts,
      sc: selectedContacts.map(c => c.id).sort(),
      sa: selectedArchitects.map(a => a.id).sort(),
      scol: selectedCollections.map(c => c.id).sort(),
      cat: selectedCategory,
      typ: selectedTypologies.sort(),
      att: selectedAttributes.sort(),
      pmr: personalMinRating,
      cmr: contactMinRating
    });
  }, [
    searchQuery,
    statusFilters,
    hideVisited,
    hideSaved,
    hideWithoutImages,
    filterContacts,
    selectedContacts,
    selectedArchitects,
    selectedCollections,
    selectedCategory,
    selectedTypologies,
    selectedAttributes,
    personalMinRating,
    contactMinRating
  ]);


  // If a user types a query or uses personal filters, we want to search the full database (ignore map bounds)
  // until they interact with the map again to filter.
  useEffect(() => {
      // Use the stable signature to detect real changes
      const filters = JSON.parse(activeFilterSignature);
      const isCleanState = !filters.q && 
                           (!filters.sf || filters.sf.length === 0) &&
                           !filters.hv && !filters.hs && !filters.hwi && !filters.fc &&
                           (!filters.sc || filters.sc.length === 0) &&
                           (!filters.sa || filters.sa.length === 0) &&
                           (!filters.scol || filters.scol.length === 0) &&
                           !filters.cat &&
                           (!filters.typ || filters.typ.length === 0) &&
                           (!filters.att || filters.att.length === 0) &&
                           filters.pmr === 0 && filters.cmr === 0;

      if (!isCleanState) {
          setSearchMode('global');
          setShouldFitBounds(true);
          setMapInteractionResetTrigger(prev => prev + 1);
          isInteractingRef.current = false; // Reset interaction flag on new filter/search
      } else {
          setSearchMode('explore');
          setSearchScope('content');
      }
  }, [activeFilterSignature]); // DEPEND ONLY ON THE STABLE SIGNATURE

  // Automatically fly to bounds of results when in global search mode
  useEffect(() => {
    // Only auto-fly if we are in Global Search Mode AND explicitly requested fit
    if (searchMode === 'global' && shouldFitBounds && buildings.length > 0 && !isInteractingRef.current) {
      const bounds = getBoundsFromBuildings(buildings);
      if (bounds) {
        // Deep equality check to prevent redundant moves (though shouldFitBounds handles most cases)
        const prev = lastBoundsRef.current;
        const isSame = prev &&
            prev.north === bounds.north &&
            prev.south === bounds.south &&
            prev.east === bounds.east &&
            prev.west === bounds.west;

        if (!isSame) {
            mapRef.current?.fitBounds(bounds);
            lastBoundsRef.current = bounds;
            setShouldFitBounds(false); // Mark fit as done
        } else {
            // Even if bounds are same, we consider "fit" done for this cycle
            setShouldFitBounds(false);
        }
      }
    }
  }, [buildings, searchMode, shouldFitBounds]);

  // 4. Merged Filtering Logic
  const filteredBuildings = useMemo(() => {
    let result = buildings;

    // A. Apply Map Bounds (Merged Logic)
    // Only filter by bounds if we have them AND we aren't explicitly ignoring them (e.g. during text search)
    if (searchMode === 'explore' && mapBounds) {
      const { north, south, east, west } = mapBounds;
      result = result.filter(b => {
        const lat = b.location_lat;
        const lng = b.location_lng;
        const inLat = lat <= north && lat >= south;
        let inLng = false;
        if (west <= east) {
          inLng = lng >= west && lng <= east;
        } else {
          inLng = lng >= west || lng <= east;
        }
        return inLat && inLng;
      });
    }

    // C. Apply Sorting (Main Branch)
    // Note: 'distance' sorting is usually handled by the backend/hook or geospatial logic, 
    // but here is a placeholder for client-side sort if needed.
    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [buildings, mapBounds, searchMode, sortBy]);

  // 5. Map Filtering
  // Since buildings from useBuildingSearch are now fully filtered (including status/exclusions),
  // we can use them directly for the map pins.
  // Exception: Hide Demolished/Unbuilt buildings from map, but keep in list.
  const mapBuildings = useMemo(() => {
    return buildings.filter(b => b.status !== 'Demolished' && b.status !== 'Unbuilt');
  }, [buildings]);

  // 6. Merged Handlers

  const handleClearAll = () => {
    setStatusFilters([]);
    setHideVisited(false);
    setHideSaved(false);
    setHideHidden(true);
    setHideWithoutImages(false);
    setFilterContacts(false);
    setPersonalMinRating(0);
    setContactMinRating(0);
    setSelectedCollections([]);
    setSelectedArchitects([]);
    setSelectedCategory(null);
    setSelectedTypologies([]);
    setSelectedAttributes([]);
    setSelectedContacts([]);
  };

  const handleUseLocation = async () => {
    const loc = await requestLocation();
    if (loc) {
      mapRef.current?.flyTo(loc);
      updateLocation(loc); 
      setSearchMode('explore'); // Feature: Reset to explore mode on explicit location use
      setShouldFitBounds(false);
    }
  };

  const handleLocationSearch = async (address: string, countryCode: string, placeName?: string) => {
    // Only trigger fly-to if it's a selection or explicit search
    if (!address || (!countryCode && !placeName)) return;

    try {
      const results = await getGeocode({ address });
      if (results && results.length > 0) {
        const { lat, lng } = await getLatLng(results[0]);
        const newLoc = { lat, lng };
        
        // Check for viewport bounds (e.g. for countries)
        const viewport = results[0].geometry.viewport;
        if (viewport) {
           const bounds = {
              north: typeof viewport.getNorthEast === 'function' ? viewport.getNorthEast().lat() : (viewport as any).northeast.lat,
              east: typeof viewport.getNorthEast === 'function' ? viewport.getNorthEast().lng() : (viewport as any).northeast.lng,
              south: typeof viewport.getSouthWest === 'function' ? viewport.getSouthWest().lat() : (viewport as any).southwest.lat,
              west: typeof viewport.getSouthWest === 'function' ? viewport.getSouthWest().lng() : (viewport as any).southwest.lng,
           };
           mapRef.current?.fitBounds(bounds);
        } else {
           // Feature: Fly to location
           mapRef.current?.flyTo(newLoc);
        }
        
        // Main: Optimistically update user location
        updateLocation(newLoc);

        // Feature: Switch to explore mode
        setSearchMode('explore');
        setShouldFitBounds(false);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  // Handle auto-fly to user location on initial load or update
  useEffect(() => {
    // Feature: Guard against auto-centering if we are ignoring map bounds (e.g. searching)
    if (gpsLocation && searchMode === 'explore') {
      const isSame = lastFlownLocationRef.current &&
                     Math.abs(lastFlownLocationRef.current.lat - gpsLocation.lat) < 0.0001 &&
                     Math.abs(lastFlownLocationRef.current.lng - gpsLocation.lng) < 0.0001;

      if (!isSame) {
        mapRef.current?.flyTo(gpsLocation);
        lastFlownLocationRef.current = gpsLocation;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsLocation, searchMode]); // Note: Depend on searchMode intentionally omitted in original, but here we check it inside

  // Feature: Guard region updates to prevent feedback loops during programmatic map movement
  const handleRegionChange = useCallback((center: { lat: number; lng: number }) => {
    if (searchMode === 'explore') {
      updateLocation(center);
    }
  }, [searchMode, updateLocation]);

  // Check if we are in the default clean state (no search/filters) to enable auto-zoom
  const isDefaultState = !searchQuery &&
                         (!statusFilters || statusFilters.length === 0) &&
                         !hideVisited &&
                         !hideSaved &&
                         !hideWithoutImages &&
                         !filterContacts &&
                         personalMinRating === 0 &&
                         contactMinRating === 0 &&
                         selectedArchitects.length === 0 &&
                         selectedCollections.length === 0 &&
                         !selectedCategory &&
                         selectedTypologies.length === 0 &&
                         selectedAttributes.length === 0 &&
                         selectedContacts.length === 0;

  const handleSearchFocus = useCallback(() => {
    setViewMode('list');
  }, [setViewMode]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      if (e.target.value) setViewMode('list');
  }, [setSearchQuery, setViewMode]);

  const handleViewModeChange = (mode: 'map' | 'list') => {
    setViewMode(mode);
    if (mode === 'map') {
      // Hide keyboard by blurring the active element
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const handleHide = useCallback(async (buildingId: string) => {
    if (!user) {
      toast.error("Please sign in to hide buildings");
      return;
    }
    const { error } = await supabase.from("user_buildings").upsert({
      user_id: user.id,
      building_id: buildingId,
      status: 'ignored',
      edited_at: new Date().toISOString()
    }, { onConflict: 'user_id, building_id' });

    if (error) {
      toast.error("Failed to hide building");
      console.error(error);
    } else {
      toast.success("Building hidden");
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses", user.id] });
      queryClient.invalidateQueries({ queryKey: ["search-buildings"] });
    }
  }, [user, queryClient]);

  const handleSave = useCallback(async (buildingId: string) => {
    if (!user) {
      toast.error("Please sign in to save buildings");
      return;
    }
    const { error } = await supabase.from("user_buildings").upsert({
      user_id: user.id,
      building_id: buildingId,
      status: 'pending',
      edited_at: new Date().toISOString()
    }, { onConflict: 'user_id, building_id' });

    if (error) {
      toast.error("Failed to save building");
      console.error(error);
    } else {
      toast.success("Building saved");
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses", user.id] });
    }
  }, [user, queryClient]);

  const handleVisit = useCallback(async (buildingId: string) => {
    if (!user) {
      toast.error("Please sign in to mark as visited");
      return;
    }
    const { error } = await supabase.from("user_buildings").upsert({
      user_id: user.id,
      building_id: buildingId,
      status: 'visited',
      edited_at: new Date().toISOString()
    }, { onConflict: 'user_id, building_id' });

    if (error) {
      toast.error("Failed to mark as visited");
      console.error(error);
    } else {
      toast.success("Marked as visited");
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses", user.id] });
    }
  }, [user, queryClient]);

  const searchBarContent = useMemo(() => (
    <div className="flex items-center w-full max-w-2xl border rounded-full bg-background shadow-md hover:shadow-lg transition-all p-1 group">
      <Search className="ml-3 h-5 w-5 text-muted-foreground shrink-0" />
      <Input
        placeholder={
          searchScope === 'users' ? "Search people..." :
          searchScope === 'architects' ? "Search architects..." :
          "Search buildings, architects..."
        }
        className="flex-1 border-none bg-transparent focus-visible:ring-0 shadow-none h-10 px-3 text-base placeholder:text-muted-foreground/70"
        value={searchQuery}
        onChange={handleSearchChange}
        onFocus={handleSearchFocus}
      />
      <div className="flex items-center gap-2 pr-1 shrink-0">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setLocationDialogOpen(true)}
          className="h-9 w-9 rounded-full shadow-sm"
          title="Search Location"
        >
          <MapPin className="h-4 w-4" />
        </Button>
        <Button
          variant={hasActiveFilters ? "default" : "secondary"}
          size="icon"
          onClick={() => setFilterSheetOpen(true)}
          className="h-9 w-9 rounded-full shadow-sm transition-colors"
          title="Filters"
        >
          <ListFilter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ), [
    searchQuery,
    searchScope,
    hasActiveFilters,
    handleSearchFocus,
    handleSearchChange,
    setLocationDialogOpen,
    setFilterSheetOpen
  ]);

  return (
    <div
      data-testid="search-page-wrapper"
      style={{
        marginLeft: state === "expanded" && !isMobile ? "calc(var(--sidebar-width) - var(--sidebar-width-icon))" : "0",
        transition: "margin-left 0.2s linear",
        width: "auto",
      }}
    >
    <AppLayout
      title="Discovery"
      showLogo={false}
      variant="map"
      isFullScreen={true}
      searchBar={searchBarContent}
    >
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="top-[20%] translate-y-0 gap-4">
            <DialogHeader>
              <DialogTitle>Search Location</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
                <LocationInput
                  value={locationQuery}
                  onLocationSelected={(address, country, place) => {
                        setLocationQuery(address);
                        handleLocationSearch(address, country, place);

                        if (country || place) {
                            setLocationDialogOpen(false);
                        }
                  }}
                  placeholder="City, Region or Country..."
                  searchTypes={["(regions)"]}
                  className="w-full"
                />
                <Button variant="outline" onClick={() => { handleUseLocation(); setLocationDialogOpen(false); }}>
                    <Locate className="mr-2 h-4 w-4" /> Use My Current Location
                </Button>
            </div>
        </DialogContent>
      </Dialog>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 flex flex-col h-full">
            <SheetHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                <SheetTitle>Filters</SheetTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 px-2 text-muted-foreground hover:text-foreground">
                      Clear All
                  </Button>
                )}
            </SheetHeader>

            <FilterDrawerContent
              statusFilters={statusFilters}
              onStatusFiltersChange={setStatusFilters}
              hideVisited={hideVisited}
              onHideVisitedChange={setHideVisited}
              hideSaved={hideSaved}
              onHideSavedChange={setHideSaved}
              hideHidden={hideHidden}
              onHideHiddenChange={setHideHidden}
              hideWithoutImages={hideWithoutImages}
              onHideWithoutImagesChange={setHideWithoutImages}
              personalMinRating={personalMinRating}
              onPersonalMinRatingChange={setPersonalMinRating}
              selectedCollections={selectedCollections}
              onCollectionsChange={setSelectedCollections}
              availableCollections={availableCollections}
              filterContacts={filterContacts}
              onFilterContactsChange={setFilterContacts}
              contactMinRating={contactMinRating}
              onContactMinRatingChange={setContactMinRating}
              selectedContacts={selectedContacts}
              onSelectedContactsChange={setSelectedContacts}
              selectedArchitects={selectedArchitects}
              onArchitectsChange={(!searchScope || searchScope === 'content') ? setSelectedArchitects : undefined}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedTypologies={selectedTypologies}
              onTypologiesChange={setSelectedTypologies}
              selectedAttributes={selectedAttributes}
              onAttributesChange={setSelectedAttributes}
              onShowLeaderboard={() => setShowLeaderboard(true)}
              onClearAll={handleClearAll}
            />
        </SheetContent>
      </Sheet>

      {/* Container to fit available height within AppLayout */}
      <div className="flex flex-col h-[calc(100dvh_-_9rem)] md:h-[100dvh] w-full">
        {searchScope === 'content' && searchQuery.length >= 3 && (
           <div className="flex flex-col">
             <UserSearchNudge
               users={foundUsers}
               onSingleMatch={handleUserSingleMatch}
               onMultipleMatch={handleUserMultipleMatch}
             />
             <ArchitectSearchNudge
               architects={foundArchitects}
               onSingleMatch={handleArchitectSingleMatch}
               onMultipleMatch={handleArchitectMultipleMatch}
             />
           </div>
        )}

        <LeaderboardDialog
          open={showLeaderboard}
          onOpenChange={setShowLeaderboard}
        />

        <div className="flex-1 relative overflow-hidden">
          {searchScope === 'users' ? (
             <div className="h-full w-full overflow-y-auto bg-background p-0">
               <UserResultsList users={foundUsers} isLoading={isUserSearchLoading} />
             </div>
          ) : searchScope === 'architects' ? (
             <div className="h-full w-full overflow-y-auto bg-background p-0">
               <ArchitectResultsList architects={foundArchitects} isLoading={isArchitectSearchLoading} />
             </div>
          ) : (
            <>
              {/* Mobile View */}
              {isMobile ? (
                <div className="h-full w-full relative">
                  <SearchModeToggle
                    mode={viewMode}
                    onModeChange={handleViewModeChange}
                    className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50"
                  />

                  {viewMode === 'list' ? (
                    <div className="h-full overflow-y-auto bg-background pb-20">
                      <DiscoveryList
                        buildings={filteredBuildings}
                        isLoading={isLoading}
                        currentLocation={userLocation}
                        itemTarget="_blank"
                        searchQuery={searchQuery}
                      />
                    </div>
                  ) : (
                    <div className="h-full w-full">
                      <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                        <BuildingDiscoveryMap
                          ref={setMapRef}
                          externalBuildings={mapBuildings}
                          onRegionChange={handleRegionChange}
                          onBoundsChange={setMapBounds}
                          onMapInteraction={handleMapInteraction}
                          isFetching={isFetching}
                          autoZoomOnLowCount={isDefaultState}
                          resetInteractionTrigger={mapInteractionResetTrigger}
                          onHide={handleHide}
                          onSave={handleSave}
                          onVisit={handleVisit}
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop Split View */
                <div className="grid grid-cols-12 h-full w-full">
                  <div className="col-span-5 lg:col-span-4 h-full flex flex-col border-r bg-background/50 backdrop-blur-sm z-10">
                    <div className="p-4 pb-2">
                      {searchBarContent}
                    </div>
                    <div className="flex-1 overflow-y-auto pb-4">
                      <DiscoveryList
                        buildings={filteredBuildings}
                        isLoading={isLoading}
                        currentLocation={userLocation}
                        itemTarget="_blank"
                        searchQuery={searchQuery}
                      />
                    </div>
                  </div>
                  <div className="col-span-7 lg:col-span-8 h-full relative">
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                      <BuildingDiscoveryMap
                        ref={setMapRef}
                        externalBuildings={mapBuildings}
                        onRegionChange={handleRegionChange}
                        onBoundsChange={setMapBounds}
                        onMapInteraction={handleMapInteraction}
                        isFetching={isFetching}
                        autoZoomOnLowCount={isDefaultState}
                        resetInteractionTrigger={mapInteractionResetTrigger}
                        onHide={handleHide}
                        onSave={handleSave}
                        onVisit={handleVisit}
                      />
                    </Suspense>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
    </div>
  );
}
