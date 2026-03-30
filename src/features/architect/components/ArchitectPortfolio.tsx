import { useArchitectPortfolio } from "../hooks/useArchitectPortfolio";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioBuildingCard, PortfolioBuildingDisplay } from "./PortfolioBuildingCard";
import { getBuildingImageUrl } from "@/utils/image";

interface ArchitectPortfolioProps {
  architectId: string;
  isOwnProfile?: boolean;
}

export function ArchitectPortfolio({ architectId, isOwnProfile }: ArchitectPortfolioProps) {
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
            let main_image_url = null;
            const selectedImage = building.hero_image_url || building.community_preview_url;

            if (selectedImage) {
              if (selectedImage.startsWith('http')) {
                main_image_url = selectedImage;
              } else {
                main_image_url = getBuildingImageUrl(selectedImage);
              }
            }

            const mappedBuilding: PortfolioBuildingDisplay = {
              id: building.id,
              name: building.name,
              main_image_url: main_image_url ?? null,
              year_completed: building.year_completed,
              architects: null,
            };

            return (
              <div key={building.id} className="min-w-0 flex flex-col">
                <PortfolioBuildingCard building={mappedBuilding} hideBucketListButton={isOwnProfile} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
