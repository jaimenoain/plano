import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/ui/LocationInput";
import { Check, ChevronsUpDown, MapPin, Sparkles, Trophy, Locate, Users, Building2, ListFilter } from "lucide-react";
import { DiscoverySearchInput } from "./DiscoverySearchInput";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type SearchScope = 'content' | 'users';

export interface DiscoveryFilterBarProps {
  // Search Props
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchScope?: SearchScope;
  
  // Location Props
  onLocationSelect: (address: string, countryCode: string, placeName?: string) => void;
  onUseLocation?: () => void;
  selectedCity: string;
  onCityChange: (value: string) => void;
  availableCities: string[];
  
  // Style Props
  selectedStyles: string[];
  onStylesChange: (styles: string[]) => void;
  availableStyles: string[];
  
  // Toggle Props
  showVisited: boolean;
  onVisitedChange: (value: boolean) => void;
  showBucketList: boolean;
  onBucketListChange: (value: boolean) => void;
  
  // Sort/Misc
  sortBy: 'distance' | 'relevance';
  onSortChange: (sort: 'distance' | 'relevance') => void;
  onShowLeaderboard?: () => void;
}

export function DiscoveryFilterBar({
  searchQuery,
  onSearchChange,
  onLocationSelect,
  selectedCity,
  onCityChange,
  availableCities,
  selectedStyles,
  onStylesChange,
  availableStyles,
  sortBy,
  onSortChange,
  showVisited,
  onVisitedChange,
  showBucketList,
  onBucketListChange,
  onShowLeaderboard,
  onUseLocation,
  searchScope,
}: DiscoveryFilterBarProps) {
  const [openStyles, setOpenStyles] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      onStylesChange(selectedStyles.filter((s) => s !== style));
    } else {
      onStylesChange([...selectedStyles, style]);
    }
  };

  return (
    <div className="bg-background border-b sticky top-0 z-10">
      {/* Desktop View */}
      <div className="hidden md:flex flex-row items-center justify-between gap-4 p-4">
        {/* Search Inputs */}
        <div className="flex flex-row gap-2 flex-1 min-w-[200px]">
          <DiscoverySearchInput
            placeholder={searchScope === 'users' ? "Search people..." : "Search buildings, architects..."}
            value={searchQuery}
            onSearchChange={onSearchChange}
            onLocationSelect={() => {}}
            className="w-full"
          />
          {(!searchScope || searchScope === 'content') && (
            <LocationInput
              value={locationQuery}
              onLocationSelected={(address, country, place) => {
                setLocationQuery(address);
                onLocationSelect(address, country, place);
              }}
              placeholder="Search location..."
              searchTypes={["(regions)"]}
              className="w-full"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Location Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onUseLocation}
            title="Use my location"
            className="shrink-0"
          >
            <Locate className="h-4 w-4" />
          </Button>

          {/* Visited Filter */}
          <Button
            variant={showVisited ? "secondary" : "outline"}
            onClick={() => onVisitedChange(!showVisited)}
            className="shrink-0"
          >
            {showVisited && <Check className="mr-2 h-4 w-4" />}
            Visited
          </Button>

          {/* Bucket List Filter */}
          <Button
            variant={showBucketList ? "secondary" : "outline"}
            onClick={() => onBucketListChange(!showBucketList)}
            className="shrink-0"
          >
            {showBucketList && <Check className="mr-2 h-4 w-4" />}
            Bucket List
          </Button>

          {/* Leaderboard Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={onShowLeaderboard}
            title="Leaderboards"
          >
            <Trophy className="h-4 w-4 text-amber-500" />
          </Button>
        </div>
      </div>

      {/* Mobile View */}
      <div className="flex md:hidden flex-row items-center gap-2 p-2">
        <DiscoverySearchInput
          placeholder={searchScope === 'users' ? "Search people..." : "Search..."}
          value={searchQuery}
          onSearchChange={onSearchChange}
          onLocationSelect={() => {}}
          className="flex-1"
        />

        <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="Search Location">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-[20%] translate-y-0 gap-4">
            <DialogHeader>
              <DialogTitle>Search Location</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <LocationInput
                value={locationQuery}
                onLocationSelected={(address, country, place) => {
                  setLocationQuery(address);
                  onLocationSelect(address, country, place);
                  setLocationDialogOpen(false);
                }}
                placeholder="City or Country..."
                searchTypes={["(regions)"]}
                className="w-full"
              />
              <Button
                variant="outline"
                onClick={() => {
                  onUseLocation?.();
                  setLocationDialogOpen(false);
                }}
                className="w-full justify-start"
              >
                <Locate className="mr-2 h-4 w-4" />
                Use My Current Location
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="Filters">
              <ListFilter className="h-5 w-5 text-muted-foreground" />
              {(showVisited || showBucketList) && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[auto] max-h-[85vh] rounded-t-xl">
            <SheetHeader className="mb-4">
              <SheetTitle>Filters & Settings</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-6 pb-6">
              {/* Filters */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">Filter Buildings</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={showVisited ? "secondary" : "outline"}
                    onClick={() => onVisitedChange(!showVisited)}
                    className="justify-start"
                  >
                    {showVisited && <Check className="mr-2 h-4 w-4" />}
                    Visited
                  </Button>
                  <Button
                    variant={showBucketList ? "secondary" : "outline"}
                    onClick={() => onBucketListChange(!showBucketList)}
                    className="justify-start"
                  >
                    {showBucketList && <Check className="mr-2 h-4 w-4" />}
                    Bucket List
                  </Button>
                </div>
              </div>

              {/* Tools */}
              <div className="flex flex-col gap-2">
                 <h3 className="text-sm font-medium text-muted-foreground">Tools</h3>
                 <Button
                  variant="outline"
                  onClick={() => {
                    onShowLeaderboard?.();
                    setMobileFilterOpen(false);
                  }}
                  className="justify-start w-full"
                >
                  <Trophy className="mr-2 h-4 w-4 text-amber-500" />
                  View Leaderboards
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
