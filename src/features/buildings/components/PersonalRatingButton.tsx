
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Circle } from "lucide-react";
import { RatingDots } from "@/components/ui/rating-dots";
import { motion, AnimatePresence } from "framer-motion";

export type BuildingStatus = 'pending' | 'visited' | 'ignored' | null;

interface PersonalRatingButtonProps {
  buildingId: string;
  initialRating: number | null;
  onRate: (buildingId: string, rating: number) => void;
  status?: BuildingStatus;
  isLoading?: boolean; // Renamed from isPending for clarity
  label?: string;
  variant?: 'popover' | 'inline';
  /**
   * Optional callback to be notified when the popover opens/closes
   */
  onOpenChange?: (open: boolean) => void;
}

export const getRatingLabel = (rating: number) => {
  switch (rating) {
    case 1: return "Impressive";
    case 2: return "Essential";
    case 3: return "Masterpiece";
    default: return `${rating} Circles`;
  }
};

export function PersonalRatingButton({
  buildingId,
  initialRating,
  onRate,
  isLoading = false,
  label = "Rate",
  variant = 'popover',
  onOpenChange
}: PersonalRatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [animatingStar, setAnimatingStar] = useState<number | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  // If initialRating is provided, display it.
  const hasRated = initialRating !== null && initialRating > 0;

  const currentLabel = hoverRating
    ? getRatingLabel(hoverRating)
    : (initialRating ? getRatingLabel(initialRating) : label);

  const handleRateClick = async (star: number) => {
    // Trigger animation state
    setAnimatingStar(star);

    // Call the rate function
    onRate(buildingId, star);

    // If it's a high rating, play animation before closing (if in popover)
    if (star >= 2) {
      // Delay closing to let the animation play
      setTimeout(() => {
        setAnimatingStar(null);
        if (variant === 'popover') {
          setIsOpen(false);
        }
      }, 600);
    } else {
      // Standard rating close immediately
      if (variant === 'popover') {
        setIsOpen(false);
      }
    }
  };

  const renderStars = () => (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex items-center gap-1.5"
        onMouseLeave={() => setHoverRating(null)}
      >
        {Array.from({ length: 3 }, (_, i) => i + 1).map((star) => {
          // Fill logic: if hovering, fill up to hoverRating. If not hovering, fill up to initialRating.
          const isFilled = (hoverRating !== null ? star <= hoverRating : (initialRating || 0) >= star);
          const isAnimating = animatingStar === star;

          return (
            <motion.button
              key={star}
              type="button"
              disabled={isLoading}
              className={`
                relative p-0.5 rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2
                ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
              `}
              onMouseEnter={() => setHoverRating(star)}
              onClick={() => handleRateClick(star)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence>
                {isAnimating && (
                   <>
                     {/* Pulse/Shockwave Effect */}
                     <motion.div
                       className="absolute inset-0 rounded-full bg-brand-primary/10"
                       initial={{ scale: 1, opacity: 0.8 }}
                       animate={{ scale: 2.5, opacity: 0 }}
                       exit={{ opacity: 0 }}
                       transition={{ duration: 0.5, ease: "easeOut" }}
                     />
                   </>
                )}
              </AnimatePresence>

              <motion.div
                 animate={isAnimating ? {
                     scale: [1, 1.4, 1],
                     transition: { duration: 0.4, type: "spring", stiffness: 300 }
                 } : {}}
              >
                  <Circle
                    className={`
                      h-5 w-5 transition-colors
                      ${isFilled ? "text-brand-primary fill-brand-primary" : "text-text-disabled"}
                    `}
                  />
              </motion.div>
            </motion.button>
          );
        })}
      </div>
      <div className="text-xs font-medium text-text-secondary h-4 text-center w-full">
        {currentLabel}
      </div>
    </div>
  );

  if (variant === 'inline') {
    return renderStars();
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={hasRated ? "default" : "ghost"}
          size="sm"
          className={`
            h-8 transition-all gap-1.5
            ${hasRated
              ? "bg-brand-primary/10 hover:bg-brand-primary/20 text-text-primary hover:text-text-primary border-brand-primary/20 border"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
            }
          `}
        >
          {hasRated ? (
            <RatingDots rating={initialRating} size="sm" />
          ) : (
            <span className="text-xs">{label}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="center" sideOffset={5}>
        {renderStars()}
      </PopoverContent>
    </Popover>
  );
}
