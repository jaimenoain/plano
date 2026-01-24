import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { BuildingDiscoveryMap } from "@/components/common/BuildingDiscoveryMap";
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
    selectedCity, setSelectedCity,
    selectedStyles, setSelectedStyles,
    sortBy, setSortBy,
    viewMode, setViewMode,
    userLocation, updateLocation,
    buildings, isLoading,
    availableCities, availableStyles,
    requestLocation
  } = useBuildingSearch();

  const [flyToCenter, setFlyToCenter] = useState<{lat: number, lng: number} | null>(null);
  const [lastFlownCity, setLastFlownCity] = useState<string>("all");

  const handleUseLocation = async () => {
    const loc = await requestLocation();
    if (loc) {
      setFlyToCenter(loc);
      setSelectedCity("all");
    }
  };

  // Handle auto-fly to user location on initial load or update
  useEffect(() => {
      // Check if userLocation is different from default London
      const isDefault = userLocation.lat === 51.5074 && userLocation.lng === -0.1278;

      if (!isDefault) {
          setFlyToCenter(userLocation);
      }
  }, [userLocation]);

  // Handle city fly-to logic
  useEffect(() => {
    if (selectedCity !== "all" && selectedCity !== lastFlownCity && buildings.length > 0) {
        // Check if the first building is actually in the selected city
        // (to avoid flying to a building from a previous query if there's a race condition,
        // though useQuery usually handles this)
        const match = buildings.find(b => b.city === selectedCity);
        if (match) {
            setFlyToCenter({ lat: match.location_lat, lng: match.location_lng });
            setLastFlownCity(selectedCity);
        }
    } else if (selectedCity === "all" && lastFlownCity !== "all") {
        setLastFlownCity("all");
    }
  }, [selectedCity, buildings, lastFlownCity]);

  return (
    <AppLayout title="Discovery" showLogo={false}>
      {/* Container to fit available height within AppLayout */}
      <div className="flex flex-col h-[calc(100vh-theme(spacing.28))] w-full">
        <div className="w-full bg-background z-20 border-b">
             <DiscoveryFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCity={selectedCity}
                onCityChange={setSelectedCity}
                availableCities={availableCities}
                selectedStyles={selectedStyles}
                onStylesChange={setSelectedStyles}
                availableStyles={availableStyles}
                sortBy={sortBy}
                onSortChange={setSortBy}
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
                            buildings={buildings}
                            isLoading={isLoading}
                            onBuildingClick={(id) => navigate(`/building/${id}`)}
                            currentLocation={userLocation}
                         />
                    </div>
                ) : (
                    <div className="h-full w-full">
                        <BuildingDiscoveryMap
                            externalBuildings={buildings}
                            onRegionChange={updateLocation}
                            forcedCenter={flyToCenter}
                        />
                    </div>
                )}
            </div>

            {/* Desktop Split View */}
            <div className="hidden md:grid grid-cols-12 h-full w-full">
                <div className="col-span-5 lg:col-span-4 h-full overflow-y-auto border-r bg-background/50 backdrop-blur-sm z-10 pb-4">
                    <DiscoveryList
                        buildings={buildings}
                        isLoading={isLoading}
                        onBuildingClick={(id) => navigate(`/building/${id}`)}
                        currentLocation={userLocation}
                    />
                </div>
                <div className="col-span-7 lg:col-span-8 h-full relative">
                    <BuildingDiscoveryMap
                         externalBuildings={buildings}
                         onRegionChange={updateLocation}
                         forcedCenter={flyToCenter}
                    />
                </div>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
