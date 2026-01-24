import { Link } from "react-router-dom";
import { Building2, MapPinPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscoveryBuilding } from "./types";
import { DiscoveryBuildingCard } from "./DiscoveryBuildingCard";
import { Skeleton } from "@/components/ui/skeleton";

interface DiscoveryListProps {
  buildings: DiscoveryBuilding[];
  isLoading: boolean;
  currentLocation?: { lat: number; lng: number };
}

export function DiscoveryList({
  buildings,
  isLoading,
  currentLocation,
}: DiscoveryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-row h-auto overflow-hidden rounded-xl border bg-card text-card-foreground shadow">
             <Skeleton className="w-32 h-32 shrink-0" />
             <div className="flex-1 p-4 space-y-2">
                 <Skeleton className="h-5 w-3/4" />
                 <Skeleton className="h-3 w-1/2" />
                 <div className="flex gap-2 pt-2">
                     <Skeleton className="h-4 w-16" />
                     <Skeleton className="h-4 w-20" />
                 </div>
             </div>
          </div>
        ))}
      </div>
    );
  }

  if (buildings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full min-h-[50vh]">
        <div className="bg-muted rounded-full p-4 mb-4">
          <Building2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No buildings found here yet</h3>
        <p className="text-muted-foreground max-w-sm mt-1 mb-6">
          Be the first to map this area.
        </p>

        {currentLocation && (
          <Button asChild>
            <Link to={`/add-building?lat=${currentLocation.lat}&lng=${currentLocation.lng}`}>
              <MapPinPlus className="mr-2 h-4 w-4" />
              Add Building Here
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-20 md:pb-4">
      {buildings.map((building) => (
        <DiscoveryBuildingCard
          key={building.id}
          building={building}
          distance={building.distance}
          socialContext={building.social_context}
        />
      ))}
    </div>
  );
}
