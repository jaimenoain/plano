import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trophy, Locate, Check } from "lucide-react";

export interface DiscoveryFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showVisited: boolean;
  onVisitedChange: (value: boolean) => void;
  showBucketList: boolean;
  onBucketListChange: (value: boolean) => void;
  onShowLeaderboard?: () => void;
  onUseLocation?: () => void;
}

export function DiscoveryFilterBar({
  searchQuery,
  onSearchChange,
  showVisited,
  onVisitedChange,
  showBucketList,
  onBucketListChange,
  onShowLeaderboard,
  onUseLocation,
}: DiscoveryFilterBarProps) {

  return (
    <div className="flex flex-col gap-4 p-4 bg-background border-b md:flex-row md:items-center md:justify-between sticky top-0 z-10">
      {/* Search Input */}
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search buildings, architects..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
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
