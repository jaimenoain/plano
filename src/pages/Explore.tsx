import { useState, useEffect, useMemo, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDiscoveryFeed } from "@/hooks/useDiscoveryFeed";
import { DiscoveryCard } from "@/components/feed/DiscoveryCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExploreTutorial } from "@/features/search/components/ExploreTutorial";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { DiscoverySearchInput } from "@/features/search/components/DiscoverySearchInput";

export default function Explore() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { state } = useSidebar();
  const [showTutorial, setShowTutorial] = useState(false);

  // Filter state
  const [locationFilter, setLocationFilter] = useState<{
    city: string | null;
    country: string | null;
    region: string | null;
    label: string | null;
  }>({ city: null, country: null, region: null, label: null });
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("explore-tutorial-seen");
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useDiscoveryFeed({
    city: locationFilter.city,
    country: locationFilter.country,
    region: locationFilter.region
  });

  const { containerRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
    }
  }, [isVisible, hasNextPage, isFetchingNextPage]);

  // Scroll handler
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      // Hide if scrolled down more than 50px
      if (scrollTop > 50) {
        setIsFilterVisible(false);
      } else {
        setIsFilterVisible(true);
      }
    }
  };

  // Place details handler
  const handlePlaceDetails = (details: google.maps.GeocoderResult) => {
    let city = null;
    let country = null;
    let region = null;
    let label = details.formatted_address;

    details.address_components.forEach(comp => {
      if (comp.types.includes('locality')) {
        city = comp.long_name;
      }
      if (comp.types.includes('country')) {
        country = comp.long_name;
      }
      if (comp.types.includes('administrative_area_level_1')) {
        region = comp.long_name;
      }
    });

    // Smart label
    if (city) {
        label = city;
    } else if (region) {
        label = region;
    } else if (country) {
        label = country;
    }

    setLocationFilter({
      city,
      country,
      region,
      label
    });
    setIsDrawerOpen(false);
    setSearchValue(""); // Clear search input

    // Reset scroll to top
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocationFilter({ city: null, country: null, region: null, label: null });
  };

  // Extract flattened list
  const allBuildings = data?.pages.flat() || [];

  // Manage hidden buildings (swiped away)
  const [hiddenBuildingIds, setHiddenBuildingIds] = useState<Set<string>>(new Set());

  const buildings = useMemo(() =>
    allBuildings.filter(b => !hiddenBuildingIds.has(b.id)),
  [allBuildings, hiddenBuildingIds]);

  const handleSkip = async (buildingId: string) => {
      try {
          if (!user) return;
          const { error } = await supabase.from("user_buildings").upsert({
              user_id: user.id,
              building_id: buildingId,
              status: 'ignored',
              edited_at: new Date().toISOString()
          }, { onConflict: 'user_id, building_id' });

          if (error) throw error;
      } catch (error) {
          console.error("Skip failed", error);
      }
  };

  const handleSwipeSave = async (buildingId: string) => {
      setHiddenBuildingIds(prev => {
          const next = new Set(prev);
          next.add(buildingId);
          return next;
      });
      toast.success("Saved to your list");

      try {
          if (!user) return;
          const { error } = await supabase.from("user_buildings").upsert({
              user_id: user.id,
              building_id: buildingId,
              status: 'pending',
              edited_at: new Date().toISOString()
          }, { onConflict: 'user_id, building_id' });

          if (error) throw error;

          queryClient.invalidateQueries({ queryKey: ['discovery_feed'] });
      } catch (error) {
          console.error("Save failed", error);
          toast.error("Failed to save");
      }
  };

  const handleSwipeHide = async (buildingId: string) => {
      setHiddenBuildingIds(prev => {
          const next = new Set(prev);
          next.add(buildingId);
          return next;
      });

      try {
          if (!user) return;
          const { error } = await supabase.from("user_buildings").upsert({
              user_id: user.id,
              building_id: buildingId,
              status: 'ignored',
              edited_at: new Date().toISOString()
          }, { onConflict: 'user_id, building_id' });

          if (error) throw error;

          queryClient.invalidateQueries({ queryKey: ['discovery_feed'] });
      } catch (error) {
          console.error("Hide failed", error);
          toast.error("Failed to skip building");
      }
  };

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
      <div
        className={cn(
          "transition-[margin-left] duration-200 ease-linear w-auto",
          state === "expanded" ? "md:ml-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]" : "md:ml-0"
        )}
      >
        <AppLayout
          isFullScreen
          showHeader={false}
        >
          {showTutorial && <ExploreTutorial onComplete={() => setShowTutorial(false)} />}

          {/* Floating Filter Button */}
          <div className={cn(
              "fixed top-4 left-0 right-0 z-50 flex justify-center transition-all duration-300 pointer-events-none",
              isFilterVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
          )}>
             <div className="pointer-events-auto">
                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Button
                        variant="secondary"
                        className="rounded-full shadow-lg bg-black/50 backdrop-blur-md text-white border border-white/20 hover:bg-black/70 pl-3 pr-4 h-10 gap-2"
                    >
                        <MapPin className="h-4 w-4 text-white/80" />
                        <span className="max-w-[200px] truncate font-medium">
                            {locationFilter.label || "World"}
                        </span>
                        {locationFilter.label && (
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={clearFilter}
                                className="ml-1 p-0.5 rounded-full hover:bg-white/20 cursor-pointer"
                            >
                                <X className="h-3 w-3" />
                            </div>
                        )}
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="h-[80vh] bg-background text-foreground">
                    <DrawerHeader>
                        <DrawerTitle>Filter by Location</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pt-0">
                        <DiscoverySearchInput
                            value={searchValue}
                            onSearchChange={setSearchValue}
                            onLocationSelect={() => {}}
                            onPlaceDetails={handlePlaceDetails}
                            placeholder="Search city, region, or country..."
                            className="w-full"
                        />
                    </div>
                  </DrawerContent>
                </Drawer>
             </div>
          </div>

          {/* Vertical Snap Container */}
          <div className="relative h-[calc(100vh-80px)] md:h-screen w-full bg-black text-white overflow-hidden">
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
            >
              {status === "pending" ? (
                <div className="h-full w-full flex items-center justify-center snap-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            ) : status === 'error' ? (
                <div className="h-full w-full flex items-center justify-center snap-center text-red-400">
                    Failed to load feed
                </div>
            ) : buildings.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center snap-center text-gray-400 gap-4">
                    <p>No buildings found</p>
                </div>
            ) : (
                buildings.map((building) => (
                    <div key={building.id} className="h-full w-full snap-start snap-always">
                        <DiscoveryCard
                            building={building}
                            onSwipeSave={() => handleSwipeSave(building.id)}
                            onSwipeHide={() => handleSwipeHide(building.id)}
                            onSkip={() => handleSkip(building.id)}
                        />
                    </div>
                ))
            )}

              {/* Infinite Scroll Trigger */}
              {(hasNextPage || isFetchingNextPage) && (
                <div ref={containerRef as any} className="h-20 w-full flex justify-center items-center p-4 snap-end">
                  {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-white/50" />}
                </div>
              )}
            </div>
          </div>
        </AppLayout>
      </div>
  );
}
