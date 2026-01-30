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
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";

interface DiscoveryCardProps {
  building: DiscoveryBuilding | DiscoveryFeedItem;
  onSave?: (e: React.MouseEvent) => void;
  onSwipeSave?: () => void;
  onSwipeHide?: () => void;
}

export function DiscoveryCard({ building, onSave: externalOnSave, onSwipeSave, onSwipeHide }: DiscoveryCardProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  // Framer Motion
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold && onSwipeSave) {
        onSwipeSave();
    } else if (info.offset.x < -threshold && onSwipeHide) {
        onSwipeHide();
    }
  };

  const nextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentImageIndex < uniqueImages.length - 1) {
          setCurrentImageIndex(prev => prev + 1);
      }
  };

  const prevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentImageIndex > 0) {
          setCurrentImageIndex(prev => prev - 1);
      }
  };

  return (
    <motion.div
      ref={containerRef as any}
      className="relative w-full h-full overflow-hidden bg-black snap-start touch-pan-y"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
    >
      {/* Background Layer - Blurred */}
      {uniqueImages[currentImageIndex] && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110"
          style={{ backgroundImage: `url("${uniqueImages[currentImageIndex]}")` }}
          aria-hidden="true"
        />
      )}

      {/* Main Image Layer */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
        {uniqueImages.length > 0 ? (
           <img
             src={uniqueImages[currentImageIndex]}
             alt={`${building.name} - view ${currentImageIndex + 1}`}
             className="w-full h-full object-contain"
           />
        ) : (
           <div className="w-full h-full flex items-center justify-center text-gray-500">
             No image available
           </div>
        )}
      </div>

      {/* Tap Zones for Image Navigation */}
      <div className="absolute inset-0 z-20 flex">
          <div className="w-1/2 h-full" onClick={prevImage} />
          <div className="w-1/2 h-full" onClick={nextImage} />
      </div>

      {/* Swipe Feedback Overlays */}
      <motion.div style={{ opacity: likeOpacity }} className="absolute top-20 left-10 z-50 border-4 border-green-500 rounded-lg p-2 transform -rotate-12 pointer-events-none">
        <span className="text-green-500 font-bold text-4xl uppercase tracking-widest">SAVED</span>
      </motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="absolute top-20 right-10 z-50 border-4 border-red-500 rounded-lg p-2 transform rotate-12 pointer-events-none">
        <span className="text-red-500 font-bold text-4xl uppercase tracking-widest">HIDE</span>
      </motion.div>

      {/* Pagination Dots (Top) */}
      {uniqueImages.length > 1 && (
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-30 px-4 pt-12 md:pt-4">
            {uniqueImages.map((_, idx) => (
                <div
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-300 shadow-sm ${idx === currentImageIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40'}`}
                />
            ))}
        </div>
      )}

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

      {/* Save Button (kept for manual click) */}
      <div className="absolute bottom-8 right-6 z-40 pointer-events-auto">
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
    </motion.div>
  );
}
