import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/ui/LocationInput";
import { Check, ChevronsUpDown, MapPin, Sparkles, Trophy, Locate } from "lucide-react";
import { DiscoverySearchInput } from "./DiscoverySearchInput";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface DiscoveryFilterBarProps {
  // Search Props
  searchQuery: string;
  onSearchChange: (value: string) => void;
  
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
}: DiscoveryFilterBarProps) {
  const [openStyles, setOpenStyles] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      onStylesChange(selectedStyles.filter((s) => s !== style));
    } else {
      onStylesChange([...selectedStyles, style]);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-background border-b md:flex-row md:items-center md:justify-between sticky top-0 z-10">
      {/* Search Inputs */}
      <div className="flex flex-col md:flex-row gap-2 flex-1 min-w-[200px]">
        <DiscoverySearchInput
          placeholder="Search buildings, architects..."
          value={searchQuery}
          onSearchChange={onSearchChange}
          className="w-full"
        />
        <LocationInput
          value={locationQuery}
          onLocationSelected={(address, country, place) => {
            setLocationQuery(address);
            onLocationSelect(address, country, place);
          }}
          placeholder="Search location..."
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
  );
}