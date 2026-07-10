import { Link } from "react-router";
import { MapPinPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DiscoveryBuilding } from "./types";
import { DiscoveryBuildingCard } from "./DiscoveryBuildingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DiscoveryListProps {
  buildings: DiscoveryBuilding[];
  isLoading: boolean;
  currentLocation?: { lat: number; lng: number };
  renderAction?: (building: DiscoveryBuilding) => React.ReactNode;
  onBuildingClick?: (building: DiscoveryBuilding) => void;
  emptyState?: React.ReactNode;
  className?: string;
  imagePosition?: 'left' | 'right';
  /** Narrow sidebar / modal lists: smaller title and thumbnail */
  variant?: 'default' | 'compact';
  itemTarget?: string;
  searchQuery?: string;
  footer?: React.ReactNode;
}

export function DiscoveryList({
  buildings,
  isLoading,
  currentLocation,
  renderAction,
  onBuildingClick,
  emptyState,
  className,
  imagePosition,
  variant = 'default',
  itemTarget,
  searchQuery,
  footer,
}: DiscoveryListProps) {
  const compact = variant === 'compact';

  if (isLoading) {
    // Skeletons mirror the loaded row exactly: unboxed, hairline-separated. A boxed
    // skeleton resolving into a floating row reads as a layout jump.
    return (
      <div className={cn(compact && "p-1")}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex h-auto flex-row overflow-hidden border-b border-border-default text-text-primary">
            <Skeleton className={cn("shrink-0 rounded-none", compact ? "w-14 h-14" : "w-32 h-32")} />
            <div className={cn("flex-1 space-y-2", compact ? "p-2" : "p-4")}>
              <Skeleton className={cn(compact ? "h-4 w-3/4" : "h-5 w-3/4")} />
              <Skeleton className="h-3 w-1/2" />
              {!compact && (
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (buildings.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>;
    }

    return (
      <EmptyState
        className="h-full min-h-[50vh]"
        eyebrow="No buildings found here yet"
        message="Be the first to map this area."
        action={
          currentLocation && (
            <Link
              to={`/add-building?lat=${currentLocation.lat}&lng=${currentLocation.lng}`}
              className="cta-link"
            >
              Add a building here
            </Link>
          )
        }
      />
    );
  }

  return (
    // Rows sit flush so their hairlines form one continuous rule down the column —
    // the kit separates results with a line, not with a gutter.
    <div className={cn("pb-20 md:pb-4", compact && "p-1 pb-4", className)}>
      {buildings.map((building) => (
        <DiscoveryBuildingCard
          key={building.id}
          building={building}
          distance={building.distance}
          socialContext={building.social_context ?? undefined}
          action={renderAction?.(building)}
          onClick={onBuildingClick ? () => onBuildingClick(building) : undefined}
          imagePosition={imagePosition}
          variant={variant}
          target={itemTarget}
        />
      ))}

      {footer}

      {searchQuery && !footer && (
        <div className="flex flex-col items-center justify-center py-8 gap-3 border-t mt-4">
          <h3 className="text-sm font-medium text-text-secondary">
            Not what you are looking for?
          </h3>
          <Button asChild variant="outline">
            <Link to={`/add-building?name=${encodeURIComponent(searchQuery)}${currentLocation ? `&lat=${currentLocation.lat}&lng=${currentLocation.lng}` : ''}`}>
              <MapPinPlus className="mr-2 h-4 w-4" />
              Add "{searchQuery}"
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
