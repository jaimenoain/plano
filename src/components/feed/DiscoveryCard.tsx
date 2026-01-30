import { useState } from "react";
import { DiscoveryBuilding } from "@/features/search/components/types";
import { getBuildingImageUrl } from "@/utils/image";
import { Bookmark, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuildingImages } from "@/hooks/useBuildingImages";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DiscoveryFeedItem } from "@/hooks/useDiscoveryFeed";
import { Link } from "react-router-dom";

interface DiscoveryCardProps {
  building: DiscoveryBuilding | DiscoveryFeedItem;
  onSave?: (e: React.MouseEvent) => void;
}

export function DiscoveryCard({ building, onSave: externalOnSave }: DiscoveryCardProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  // Lazy loading setup
  const { containerRef, isVisible } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Fetch additional images only when visible
  const { data: additionalImages } = useBuildingImages(building.id, isVisible);

  const mainImageUrl = getBuildingImageUrl(building.main_image_url);

  // Combine images
  const galleryImages = [
    mainImageUrl,
    ...(additionalImages?.map(img => getBuildingImageUrl(img.storage_path)) || [])
  ].filter((url): url is string => !!url);

  // De-duplicate images just in case
  const uniqueImages = Array.from(new Set(galleryImages));

  // Format architect names (handle if architects is undefined, e.g. from FeedItem)
  const architectNames = building.architects?.map((a: any) => a.name).join(", ");

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (externalOnSave) {
        externalOnSave(e);
    }

    if (!user) {
        toast.error("Please sign in to save buildings");
        return;
    }

    // Optimistic UI
    setIsSaved(true);
    toast.success("Saved to your list");

    try {
      const { error } = await supabase.from("user_buildings").upsert({
          user_id: user.id,
          building_id: building.id,
          status: 'pending',
          edited_at: new Date().toISOString()
      }, { onConflict: 'user_id, building_id' });

      if (error) throw error;
    } catch (error) {
        console.error("Save failed", error);
        setIsSaved(false);
        toast.error("Failed to save");
    }
  };

  return (
    <div
      ref={containerRef as any}
      className="relative w-full h-full overflow-hidden bg-black snap-start"
    >
      {/* Background Layer - Blurred (using first image) */}
      {uniqueImages[0] && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110 transition-opacity duration-1000"
          style={{ backgroundImage: `url("${uniqueImages[0]}")` }}
          aria-hidden="true"
        />
      )}

      {/* Gallery Layer - Horizontal Scroll */}
      <div className="absolute inset-0 z-10 flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
        {uniqueImages.length > 0 ? (
          uniqueImages.map((img, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center relative"
            >
              <img
                src={img}
                alt={`${building.name} - view ${idx + 1}`}
                className="w-full h-full object-contain"
                loading={idx === 0 ? "eager" : "lazy"}
              />
              {/* Pagination Dots Overlay for this image */}
              {uniqueImages.length > 1 && (
                 <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-30 pb-16 md:pb-0">
                    {uniqueImages.map((_, dotIdx) => (
                        <div
                            key={dotIdx}
                            className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all ${dotIdx === idx ? 'bg-white scale-110' : 'bg-white/40'}`}
                        />
                    ))}
                 </div>
              )}
            </div>
          ))
        ) : (
           <div className="w-full h-full flex items-center justify-center text-gray-500 z-10">
             No image available
           </div>
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none" />

      {/* Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-30 text-white pb-24 md:pb-6 pointer-events-none">
        <Link
          to={`/building/${building.id}/${building.slug || 'details'}`}
          className="pointer-events-auto hover:underline block w-fit"
        >
          <h2 className="text-3xl font-bold mb-1 leading-tight drop-shadow-md">{building.name}</h2>
        </Link>

        <div className="text-lg text-gray-200 font-medium mb-1 drop-shadow-md">
          {building.city && building.country
            ? `${building.city}, ${building.country}`
            : building.city || building.country || 'Location unknown'}
        </div>

        {architectNames && (
          <div className="text-sm text-gray-300 font-light drop-shadow-md">
            {architectNames}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="absolute bottom-8 right-6 z-40">
        <Button
          variant={isSaved ? "default" : "secondary"}
          size="icon"
          className={`h-12 w-12 rounded-full shadow-lg border-none backdrop-blur-md transition-all duration-300 ${
              isSaved ? "bg-green-500 hover:bg-green-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          onClick={handleSave}
        >
          {isSaved ? <Check className="h-6 w-6" /> : <Bookmark className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  );
}
