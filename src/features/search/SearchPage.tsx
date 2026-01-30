import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { BuildingDiscoveryMap } from "@/components/common/BuildingDiscoveryMap";
import { DiscoveryFilterBar, SearchScope } from "./components/DiscoveryFilterBar";
import { DiscoveryList } from "./components/DiscoveryList";
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

export default function SearchPage() {
  const navigate = useNavigate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>('content');
   
  // 1. Existing hooks
  const {
    searchQuery, setSearchQuery,
    filterVisited, setFilterVisited,
    filterBucketList, setFilterBucketList,
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
  const [flyToCenter, setFlyToCenter] = useState<{lat: number, lng: number} | null>(null);
  const [flyToBounds, setFlyToBounds] = useState<Bounds | null>(null);
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);
  const [ignoreMapBounds, setIgnoreMapBounds] = useState(false);
  const [mapInteractionResetTrigger, setMapInteractionResetTrigger] = useState(0);

  // Main: Filter controls
  const [sortBy, setSortBy] = useState<string>("distance");

  // If a user types a query or uses personal filters, we want to search the full database (ignore map bounds)
  // until they interact with the map again to filter.
  useEffect(() => {
      if (
        searchQuery ||
        filterVisited ||
        filterBucketList ||
        filterContacts ||
        selectedContacts.length > 0 ||
        selectedArchitects.length > 0 ||
        selectedCollections.length > 0 ||
        selectedCategory ||
        selectedTypologies.length > 0 ||
        selectedAttributes.length > 0 ||
        personalMinRating > 0 ||
        contactMinRating > 0
      ) {
          setIgnoreMapBounds(true);
          setMapInteractionResetTrigger(prev => prev + 1);
      } else {
          setIgnoreMapBounds(false);
          setSearchScope('content');
      }
  }, [
    searchQuery,
    filterVisited,
    filterBucketList,
    filterContacts,
    selectedContacts.length,
    selectedArchitects.length,
    selectedCollections.length,
    selectedCategory,
    selectedTypologies.length,
    selectedAttributes.length,
    personalMinRating,
    contactMinRating
  ]);

  // Automatically fly to bounds of results when in global search mode
  useEffect(() => {
    if (ignoreMapBounds && buildings.length > 0) {
      const bounds = getBoundsFromBuildings(buildings);
      if (bounds) {
        setFlyToBounds((prev) => {
          if (
            prev &&
            prev.north === bounds.north &&
            prev.south === bounds.south &&
            prev.east === bounds.east &&
            prev.west === bounds.west
          ) {
            return prev;
          }
          return bounds;
        });
        setFlyToCenter(null);
      }
    }
  }, [buildings, ignoreMapBounds]);

  // 4. Merged Filtering Logic
  const filteredBuildings = useMemo(() => {
    let result = buildings;

    // A. Apply Map Bounds (Merged Logic)
    // Only filter by bounds if we have them AND we aren't explicitly ignoring them (e.g. during text search)
    if (!ignoreMapBounds && mapBounds) {
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
  }, [buildings, mapBounds, ignoreMapBounds, sortBy]);

  // 5. Map Filtering (Hide Demolished/Unbuilt)
  const mapBuildings = useMemo(() => {
    return buildings.filter(b => b.status !== 'Demolished' && b.status !== 'Unbuilt');
  }, [buildings]);

  // 6. Merged Handlers

  const handleUseLocation = async () => {
    const loc = await requestLocation();
    if (loc) {
      setFlyToCenter(loc);
      setFlyToBounds(null);
      updateLocation(loc); 
      setIgnoreMapBounds(false); // Feature: Reset bounds ignore on explicit location use
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
           setFlyToBounds({
              north: typeof viewport.getNorthEast === 'function' ? viewport.getNorthEast().lat() : (viewport as any).northeast.lat,
              east: typeof viewport.getNorthEast === 'function' ? viewport.getNorthEast().lng() : (viewport as any).northeast.lng,
              south: typeof viewport.getSouthWest === 'function' ? viewport.getSouthWest().lat() : (viewport as any).southwest.lat,
              west: typeof viewport.getSouthWest === 'function' ? viewport.getSouthWest().lng() : (viewport as any).southwest.lng,
           });
           setFlyToCenter(null);
        } else {
           // Feature: Fly to location
           setFlyToCenter(newLoc);
           setFlyToBounds(null);
        }
        
        // Main: Optimistically update user location
        updateLocation(newLoc);

        // Feature: Re-enable bounds filtering once we fly to the new location
        setIgnoreMapBounds(false);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  // Handle auto-fly to user location on initial load or update
  useEffect(() => {
    if (gpsLocation) {
      setFlyToCenter(gpsLocation);
    }
  }, [gpsLocation]);

  // Check if we are in the default clean state (no search/filters) to enable auto-zoom
  const isDefaultState = !searchQuery &&
                         !filterVisited &&
                         !filterBucketList &&
                         !filterContacts &&
                         personalMinRating === 0 &&
                         contactMinRating === 0 &&
                         selectedArchitects.length === 0 &&
                         selectedCollections.length === 0 &&
                         !selectedCategory &&
                         selectedTypologies.length === 0 &&
                         selectedAttributes.length === 0 &&
                         selectedContacts.length === 0;

  const handleSearchFocus = () => {
    setViewMode('list');
  };

  const handleViewModeChange = (mode: 'map' | 'list') => {
    setViewMode(mode);
    if (mode === 'map') {
      // Hide keyboard by blurring the active element
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  return (
    <AppLayout title="Discovery" showLogo={false}>
      {/* Container to fit available height within AppLayout */}
      <div className="flex flex-col h-[calc(100dvh_-_9.5rem_-_env(safe-area-inset-bottom))] w-full">
        <div className="w-full bg-background z-20 border-b">
          <DiscoveryFilterBar
            searchQuery={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              if (val) setViewMode('list');
            }}
            onSearchFocus={handleSearchFocus}
            // --- Feature Branch Props (Location Search & New Filters) ---
            onLocationSelect={handleLocationSearch}
            selectedArchitects={selectedArchitects}
            onArchitectsChange={setSelectedArchitects}
            selectedCollections={selectedCollections}
            onCollectionsChange={setSelectedCollections}
            availableCollections={availableCollections}
            sortBy={sortBy}
            onSortChange={setSortBy}
            // --- Main Branch Props (Visited/Bucket Toggles) ---
            showVisited={filterVisited}
            onVisitedChange={setFilterVisited}
            showBucketList={filterBucketList}
            onBucketListChange={setFilterBucketList}
            filterContacts={filterContacts}
            onFilterContactsChange={setFilterContacts}

            personalMinRating={personalMinRating}
            onPersonalMinRatingChange={setPersonalMinRating}
            contactMinRating={contactMinRating}
            onContactMinRatingChange={setContactMinRating}

            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedTypologies={selectedTypologies}
            onTypologiesChange={setSelectedTypologies}
            selectedAttributes={selectedAttributes}
            onAttributesChange={setSelectedAttributes}
            selectedContacts={selectedContacts}
            onSelectedContactsChange={setSelectedContacts}

            // --- Shared Props ---
            onShowLeaderboard={() => setShowLeaderboard(true)}
            onUseLocation={handleUseLocation}
            searchScope={searchScope}
          />
        </div>

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
              <div className="md:hidden h-full w-full relative">
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
                    />
                  </div>
                ) : (
                  <div className="h-full w-full">
                    <BuildingDiscoveryMap
                      externalBuildings={mapBuildings}
                      onRegionChange={updateLocation}
                      onBoundsChange={setMapBounds}
                      onMapInteraction={() => setIgnoreMapBounds(false)}
                      forcedCenter={flyToCenter}
                      isFetching={isFetching}
                      autoZoomOnLowCount={isDefaultState}
                      forcedBounds={flyToBounds}
                      resetInteractionTrigger={mapInteractionResetTrigger}
                    />
                  </div>
                )}
              </div>

              {/* Desktop Split View */}
              <div className="hidden md:grid grid-cols-12 h-full w-full">
                <div className="col-span-5 lg:col-span-4 h-full overflow-y-auto border-r bg-background/50 backdrop-blur-sm z-10 pb-4">
                  <DiscoveryList
                    buildings={filteredBuildings}
                    isLoading={isLoading}
                    currentLocation={userLocation}
                  />
                </div>
                <div className="col-span-7 lg:col-span-8 h-full relative">
                  <BuildingDiscoveryMap
                    externalBuildings={mapBuildings}
                    onRegionChange={updateLocation}
                    onBoundsChange={setMapBounds}
                    onMapInteraction={() => setIgnoreMapBounds(false)}
                    forcedCenter={flyToCenter}
                    isFetching={isFetching}
                    autoZoomOnLowCount={isDefaultState}
                    forcedBounds={flyToBounds}
                    resetInteractionTrigger={mapInteractionResetTrigger}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
