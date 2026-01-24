import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { BuildingDiscoveryMap, Bounds } from "@/components/common/BuildingDiscoveryMap";
import { DiscoveryFilterBar } from "./components/DiscoveryFilterBar";
import { DiscoveryList } from "./components/DiscoveryList";
import { SearchModeToggle } from "./components/SearchModeToggle";
import { useBuildingSearch } from "./hooks/useBuildingSearch";
import { LeaderboardDialog } from "./components/LeaderboardDialog";
import { getGeocode, getLatLng } from "use-places-autocomplete";

export default function SearchPage() {
  const navigate = useNavigate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
   
  // 1. Existing hooks
  const {
    searchQuery, setSearchQuery,
    filterVisited, setFilterVisited,
    filterBucketList, setFilterBucketList,
    viewMode, setViewMode,
    userLocation, updateLocation,
    buildings, isLoading,
    requestLocation, gpsLocation
  } = useBuildingSearch();

  // 2. New State (Merged Feature + Main)
  // Feature: Map Interaction controls
  const [flyToCenter, setFlyToCenter] = useState<{lat: number, lng: number} | null>(null);
  const [flyToBounds, setFlyToBounds] = useState<Bounds | null>(null);
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);
  const [ignoreMapBounds, setIgnoreMapBounds] = useState(false);

  // Main: Filter controls
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("distance");

  // If a user types a query, we want to search the full database (ignore map bounds)
  // until they interact with the map again to filter.
  useEffect(() => {
      if (searchQuery) {
          setIgnoreMapBounds(true);
      } else {
          setIgnoreMapBounds(false);
      }
  }, [searchQuery]);

  // 3. Derive Available Options from Data (Required for the new FilterBar)
  const availableCities = useMemo(() => {
    const cities = new Set(buildings.map(b => b.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [buildings]);

  const availableStyles = useMemo(() => {
    const styles = new Set(buildings.flatMap(b => b.architecture_styles || []));
    return Array.from(styles).sort();
  }, [buildings]);

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

    // B. Apply New Filters (Main Branch)
    if (selectedCity !== "all") {
      result = result.filter(b => b.city === selectedCity);
    }

    if (selectedStyles.length > 0) {
      result = result.filter(b => 
        b.architecture_styles?.some(style => selectedStyles.includes(style))
      );
    }

    // C. Apply Sorting (Main Branch)
    // Note: 'distance' sorting is usually handled by the backend/hook or geospatial logic, 
    // but here is a placeholder for client-side sort if needed.
    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [buildings, mapBounds, ignoreMapBounds, selectedCity, selectedStyles, sortBy]);

  // 5. Merged Handlers

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
        
        // Main: Reset city filter & Optimistically update user location
        setSelectedCity("all");
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

  return (
    <AppLayout title="Discovery" showLogo={false}>
      {/* Container to fit available height within AppLayout */}
      <div className="flex flex-col h-[calc(100vh-theme(spacing.28))] w-full">
        <div className="w-full bg-background z-20 border-b">
          <DiscoveryFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            // --- Feature Branch Props (Location Search & New Filters) ---
            onLocationSelect={handleLocationSearch}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            availableCities={availableCities}
            selectedStyles={selectedStyles}
            onStylesChange={setSelectedStyles}
            availableStyles={availableStyles}
            sortBy={sortBy}
            onSortChange={setSortBy}
            // --- Main Branch Props (Visited/Bucket Toggles) ---
            showVisited={filterVisited}
            onVisitedChange={setFilterVisited}
            showBucketList={filterBucketList}
            onBucketListChange={setFilterBucketList}
            // --- Shared Props ---
            onShowLeaderboard={() => setShowLeaderboard(true)}
            onUseLocation={handleUseLocation}
          />
        </div>

        <LeaderboardDialog
          open={showLeaderboard}
          onOpenChange={setShowLeaderboard}
        />

        <div className="flex-1 relative overflow-hidden">
          {/* Mobile View */}
          <div className="md:hidden h-full w-full relative">
            <SearchModeToggle
              mode={viewMode}
              onModeChange={setViewMode}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
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
                  externalBuildings={buildings}
                  onRegionChange={updateLocation}
                  onBoundsChange={setMapBounds}
                  onMapInteraction={() => setIgnoreMapBounds(false)}
                  forcedCenter={flyToCenter}
                  forcedBounds={flyToBounds}
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
                externalBuildings={buildings}
                onRegionChange={updateLocation}
                onBoundsChange={setMapBounds}
                onMapInteraction={() => setIgnoreMapBounds(false)}
                forcedCenter={flyToCenter}
                forcedBounds={flyToBounds}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}