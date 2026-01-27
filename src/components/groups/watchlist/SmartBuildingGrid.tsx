import { Building2 } from "lucide-react";
import { SmartBuilding, SmartBuildingCard } from "./SmartBuildingCard";

interface SmartBuildingGridProps {
  buildings: SmartBuilding[];
  isLoading: boolean;
}

export function SmartBuildingGrid({ buildings, isLoading }: SmartBuildingGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (buildings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
           <Building2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold">No matches found</h3>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Try adjusting your filters or selecting different members to see more results.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-in fade-in duration-500">
      {buildings.map((building) => (
        <SmartBuildingCard key={building.id} building={building} />
      ))}
    </div>
  );
}
