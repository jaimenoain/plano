
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Circle } from "lucide-react";
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
        className="flex items-center gap-1"
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
                relative p-0.5 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
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
                       className="absolute inset-0 rounded-full bg-[#595959]/20"
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
                      w-6 h-6 transition-colors
                      ${isFilled ? "fill-[#595959] text-[#595959]" : "text-muted-foreground/20"}
                    `}
                  />
              </motion.div>
            </motion.button>
          );
        })}
      </div>
      <div className="text-xs font-medium text-muted-foreground h-4 text-center w-full">
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
              ? "bg-primary/10 hover:bg-primary/20 text-[#595959] hover:text-[#595959] border-primary/20 border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }
          `}
        >
          {hasRated ? (
            <>
              <Circle className="w-3.5 h-3.5 fill-[#595959]" />
              <span className="font-bold">{initialRating}/3</span>
            </>
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
