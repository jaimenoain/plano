import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { BuildingDiscoveryMap, Bounds } from "@/components/common/BuildingDiscoveryMap";
import { DiscoveryFilterBar } from "./components/DiscoveryFilterBar";
import { DiscoveryList } from "./components/DiscoveryList";
import { SearchModeToggle } from "./components/SearchModeToggle";
import { useBuildingSearch } from "./hooks/useBuildingSearch";
import { LeaderboardDialog } from "./components/LeaderboardDialog";

export default function SearchPage() {
  const navigate = useNavigate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const {
    searchQuery, setSearchQuery,
    filterVisited, setFilterVisited,
    filterBucketList, setFilterBucketList,
    viewMode, setViewMode,
    userLocation, updateLocation,
    buildings, isLoading,
    requestLocation, gpsLocation
  } = useBuildingSearch();

  const [flyToCenter, setFlyToCenter] = useState<{lat: number, lng: number} | null>(null);
  const [lastFlownCity, setLastFlownCity] = useState<string>("all");
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);
  const [ignoreMapBounds, setIgnoreMapBounds] = useState(false);

  // If a user types a query, we want to search the full database (ignore map bounds)
  // until they interact with the map again to filter.
  useEffect(() => {
      if (searchQuery) {
          setIgnoreMapBounds(true);
      } else {
          setIgnoreMapBounds(false);
      }
  }, [searchQuery]);

  const filteredBuildings = useMemo(() => {
      if (ignoreMapBounds) return buildings;
      if (!mapBounds) return buildings;

      const { north, south, east, west } = mapBounds;
      return buildings.filter(b => {
          const lat = b.location_lat;
          const lng = b.location_lng;

          // Basic bounds check
          const inLat = lat <= north && lat >= south;

          // Handle dateline crossing if necessary (if west > east)
          let inLng = false;
          if (west <= east) {
              inLng = lng >= west && lng <= east;
          } else {
              // crossing dateline
              inLng = lng >= west || lng <= east;
          }

          return inLat && inLng;
      });
  }, [buildings, mapBounds, ignoreMapBounds]);

  const handleUseLocation = async () => {
    const loc = await requestLocation();
    if (loc) {
      setFlyToCenter(loc);
      setIgnoreMapBounds(false);
    }
  };

  const handleLocationSelect = (loc: { lat: number; lng: number }) => {
    setFlyToCenter(loc);
    // Optimistically update location for distance sorting
    updateLocation(loc);
    setIgnoreMapBounds(false);
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
                showVisited={filterVisited}
                onVisitedChange={setFilterVisited}
                showBucketList={filterBucketList}
                onBucketListChange={setFilterBucketList}
                onShowLeaderboard={() => setShowLeaderboard(true)}
                onUseLocation={handleUseLocation}
                onLocationSelect={handleLocationSelect}
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
                    />
                </div>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
