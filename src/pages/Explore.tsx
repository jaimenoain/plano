import { useState, useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDiscoveryFeed, DiscoveryFilters } from "@/hooks/useDiscoveryFeed";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DiscoveryCard } from "@/components/feed/DiscoveryCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Button } from "@/components/ui/button";
import { Loader2, ListFilter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterDrawerContent } from "@/components/common/FilterDrawerContent";
import { UserSearchResult } from "@/features/search/hooks/useUserSearch";
import { ExploreTutorial } from "@/features/search/components/ExploreTutorial";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";

export default function Explore() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useUserProfile();

  // Filter States
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTypologies, setSelectedTypologies] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [selectedArchitects, setSelectedArchitects] = useState<{ id: string; name: string }[]>([]);

  // Unused personal filters (kept for compatibility with drawer)
  const [showVisited, setShowVisited] = useState(false);
  const [showBucketList, setShowBucketList] = useState(false);
  const [personalMinRating, setPersonalMinRating] = useState(0);
  const [filterContacts, setFilterContacts] = useState(false);
  const [contactMinRating, setContactMinRating] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState<UserSearchResult[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("explore-tutorial-seen");
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filters: DiscoveryFilters = useMemo(() => ({
    city: cityFilter,
    categoryId: selectedCategory,
    typologyIds: selectedTypologies,
    attributeIds: selectedAttributes,
    architectIds: selectedArchitects.map(a => a.id)
  }), [cityFilter, selectedCategory, selectedTypologies, selectedAttributes, selectedArchitects]);

  const hasActiveFilters =
    !!cityFilter ||
    !!selectedCategory ||
    selectedTypologies.length > 0 ||
    selectedAttributes.length > 0 ||
    selectedArchitects.length > 0;

  const handleClearAll = () => {
    setCityFilter(null);
    setSelectedCategory(null);
    setSelectedTypologies([]);
    setSelectedAttributes([]);
    setSelectedArchitects([]);
    // Clear unused
    setShowVisited(false);
    setShowBucketList(false);
    setPersonalMinRating(0);
    setFilterContacts(false);
    setContactMinRating(0);
    setSelectedContacts([]);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useDiscoveryFeed(filters);

  const { containerRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
    }
  }, [isVisible, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isFilterOpen) {
        navigate("/");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [navigate, isFilterOpen]);

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
    <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
      <AppLayout
        isFullScreen
        showHeader={false}
        variant="map"
        searchBar={
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search location..."
              className="pl-9 bg-background/90 backdrop-blur-sm"
              value={cityFilter || ""}
              readOnly
              onClick={() => setIsFilterOpen(true)}
            />
          </div>
        }
        rightAction={
          <SheetTrigger asChild>
            <Button
              variant={hasActiveFilters ? "secondary" : "ghost"}
              size="icon"
              className={hasActiveFilters ? 'text-primary' : ''}
            >
              <ListFilter className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        }
      >
        <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 flex flex-col h-full z-[100]">
            <SheetHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                <SheetTitle>Filters</SheetTitle>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 px-2 text-muted-foreground hover:text-foreground">
                        Clear All
                    </Button>
                )}
            </SheetHeader>
            <FilterDrawerContent
                showLocationInput={true}
                locationQuery={cityFilter || ""}
                onLocationSelect={(addr, country, place) => {
                      const city = place || addr.split(',')[0].trim();
                      setCityFilter(city);
                }}
                onUseLocation={() => {
                    if (profile?.location) {
                        setCityFilter(profile.location);
                    }
                }}

                hidePersonalFilters={true} // Hide Visited/BucketList

                // Pass all states
                statusFilters={[]}
                onStatusFiltersChange={() => {}}
                hideVisited={!showVisited}
                onHideVisitedChange={(val) => setShowVisited(!val)}
                hideSaved={!showBucketList}
                onHideSavedChange={(val) => setShowBucketList(!val)}
                hideHidden={true}
                onHideHiddenChange={() => {}}
                personalMinRating={personalMinRating}
                onPersonalMinRatingChange={setPersonalMinRating}
                filterContacts={filterContacts}
                onFilterContactsChange={setFilterContacts}
                contactMinRating={contactMinRating}
                onContactMinRatingChange={setContactMinRating}
                selectedContacts={selectedContacts}
                onSelectedContactsChange={setSelectedContacts}

                selectedCollections={[]}
                onCollectionsChange={() => {}}
                availableCollections={[]}

                selectedArchitects={selectedArchitects}
                onArchitectsChange={setSelectedArchitects}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedTypologies={selectedTypologies}
                onTypologiesChange={setSelectedTypologies}
                selectedAttributes={selectedAttributes}
                onAttributesChange={setSelectedAttributes}

                onClearAll={handleClearAll}
            />
        </SheetContent>

        {showTutorial && <ExploreTutorial onComplete={() => setShowTutorial(false)} />}

        {/* Vertical Snap Container */}
        <div className="relative h-[calc(100vh-80px)] w-full bg-black text-white overflow-hidden">
          <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar">
            {status === 'pending' ? (
                <div className="h-full w-full flex items-center justify-center snap-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            ) : status === 'error' ? (
                <div className="h-full w-full flex items-center justify-center snap-center text-red-400">
                    Failed to load feed
                </div>
            ) : buildings.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center snap-center text-gray-400 gap-4">
                    <p>No buildings found {cityFilter && `in ${cityFilter}`}</p>
                    <Button variant="outline" onClick={handleClearAll}>
                        Clear Filters
                    </Button>
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
    </Sheet>
  );
}
