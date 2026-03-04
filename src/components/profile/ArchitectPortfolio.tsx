import { useArchitectPortfolio } from "@/hooks/useArchitectPortfolio";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartBuildingCard, SmartBuilding } from "@/components/groups/watchlist/SmartBuildingCard";
import { getBuildingImageUrl } from "@/utils/image";

interface ArchitectPortfolioProps {
  architectId: string;
}

export function ArchitectPortfolio({ architectId }: ArchitectPortfolioProps) {
  const { buildings, isLoading } = useArchitectPortfolio(architectId);

  return (
    <div className="py-6">
      <h3 className="text-xl font-semibold mb-6">Portfolio</h3>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-xl w-full" />
          ))}
        </div>
      ) : buildings.length === 0 ? (
        <div className="py-12 text-center border rounded-xl bg-secondary/10">
          <p className="text-muted-foreground">System recognizes you as a verified architect, but no buildings were found in your portfolio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map((building) => {
            // Map PortfolioBuilding to SmartBuilding expected format for a premium visual grid
            const mappedBuilding: SmartBuilding = {
              id: building.id,
              name: building.name,
              main_image_url: building.building_images?.[0]?.storage_path ? getBuildingImageUrl(building.building_images[0].storage_path) : null,
              year_completed: null,
              architects: null,
              overlap_count: 0,
              interested_users: [],
              total_selected_members: 0,
              is_in_pipeline: false,
            };

            return (
              <div key={building.id} className="min-w-0 flex flex-col">
                <SmartBuildingCard
                  building={mappedBuilding}
                  groupId="" // Empty group ID as it's not used in this context but required by the prop type
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
