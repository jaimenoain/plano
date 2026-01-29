import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDiscoveryFeed, DiscoveryFilters } from "@/hooks/useDiscoveryFeed";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DiscoveryCard } from "@/components/feed/DiscoveryCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Button } from "@/components/ui/button";
import { Loader2, ListFilter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterDrawerContent } from "@/components/common/FilterDrawerContent";
import { UserSearchResult } from "@/features/search/hooks/useUserSearch";

export default function Explore() {
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
    setSelectedTags([]);
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

  // Extract flattened list
  const buildings = data?.pages.flat() || [];

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="relative h-screen w-full bg-black text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-center gap-4 pt-12 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex gap-2">
            <Button
                variant={!hasActiveFilters ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full backdrop-blur-md transition-all ${!hasActiveFilters ? 'bg-white/90 text-black hover:bg-white' : 'text-white hover:bg-white/20'}`}
                onClick={handleClearAll}
            >
                Global
            </Button>

            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant={hasActiveFilters ? "secondary" : "ghost"}
                        size="sm"
                        className={`rounded-full backdrop-blur-md transition-all gap-2 ${hasActiveFilters ? 'bg-white/90 text-black hover:bg-white' : 'text-white hover:bg-white/20'}`}
                    >
                        Filter
                        <ListFilter className="h-3 w-3" />
                    </Button>
                </SheetTrigger>
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
                        showVisited={showVisited}
                        onVisitedChange={setShowVisited}
                        showBucketList={showBucketList}
                        onBucketListChange={setShowBucketList}
                        personalMinRating={personalMinRating}
                        onPersonalMinRatingChange={setPersonalMinRating}
                        filterContacts={filterContacts}
                        onFilterContactsChange={setFilterContacts}
                        contactMinRating={contactMinRating}
                        onContactMinRatingChange={setContactMinRating}
                        selectedContacts={selectedContacts}
                        onSelectedContactsChange={setSelectedContacts}
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}

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
            </Sheet>
        </div>
      </div>

      {/* Vertical Snap Container */}
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
                <div key={building.id} className="h-full w-full snap-start">
                    <DiscoveryCard building={building} />
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
  );
}