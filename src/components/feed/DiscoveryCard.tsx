import { DiscoveryBuilding } from "@/features/search/components/types";
import { getBuildingImageUrl } from "@/utils/image";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiscoveryCardProps {
  building: DiscoveryBuilding;
  onSave?: (e: React.MouseEvent) => void;
}

export function DiscoveryCard({ building, onSave }: DiscoveryCardProps) {
  const imageUrl = getBuildingImageUrl(building.main_image_url);

  // Format architect names
  const architectNames = building.architects?.map(a => a.name).join(", ");

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Background Layer - Blurred */}
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-60 scale-110"
          style={{ backgroundImage: `url("${imageUrl}")` }}
          aria-hidden="true"
        />
      )}

      {/* Foreground Layer - Contained Image */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        {imageUrl ? (
            <img
              src={imageUrl}
              alt={building.name}
              className="w-full h-full object-contain"
            />
        ) : (
            <div className="text-gray-500">No image available</div>
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-black via-black/70 to-transparent z-20 pointer-events-none" />

      {/* Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-30 text-white pb-20">
        <h2 className="text-3xl font-bold mb-1 leading-tight">{building.name}</h2>

        <div className="text-lg text-gray-200 font-medium mb-1">
          {building.city && building.country
            ? `${building.city}, ${building.country}`
            : building.city || building.country || 'Location unknown'}
        </div>

        {architectNames && (
          <div className="text-sm text-gray-400 font-light">
            {architectNames}
          </div>
        )}
      </div>

      {/* Visual Indicators (Dots) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
      </div>

      {/* Save Button */}
      <div className="absolute bottom-6 right-6 z-40">
        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md"
          onClick={onSave}
        >
          <Bookmark className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
