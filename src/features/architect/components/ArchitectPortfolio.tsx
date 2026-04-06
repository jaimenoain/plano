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
      <h3 className="text-xs font-medium tracking-widest uppercase text-text-secondary mb-6">Portfolio</h3>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border-default">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-none w-full" />
          ))}
        </div>
      ) : buildings.length === 0 ? (
        <div className="py-12 text-center border-t border-border-default">
          <p className="text-text-secondary">No buildings in portfolio yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border-default">
          {buildings.map((building) => {
            // Map PortfolioBuilding to SmartBuilding expected format for a premium visual grid
            let main_image_url: string | null = null;
            const selectedImage = building.hero_image_url || building.community_preview_url;

            if (selectedImage) {
              if (selectedImage.startsWith('http')) {
                main_image_url = selectedImage;
              } else {
                main_image_url = getBuildingImageUrl(selectedImage) ?? null;
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
