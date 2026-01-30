
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Circle } from "lucide-react";

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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  // If initialRating is provided, display it.
  const hasRated = initialRating !== null && initialRating > 0;

  const currentLabel = hoverRating
    ? getRatingLabel(hoverRating)
    : (initialRating ? getRatingLabel(initialRating) : `Your ${label.toLowerCase()}`);

  const renderStars = () => (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverRating(null)}
      >
        {Array.from({ length: 3 }, (_, i) => i + 1).map((star) => {
          // Fill logic: if hovering, fill up to hoverRating. If not hovering, fill up to initialRating.
          const isFilled = (hoverRating !== null ? star <= hoverRating : (initialRating || 0) >= star);

          return (
            <button
              key={star}
              type="button"
              disabled={isLoading}
              className={`
                p-0.5 rounded-sm transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
              `}
              onMouseEnter={() => setHoverRating(star)}
              onClick={() => {
                onRate(buildingId, star);
                setIsOpen(false);
              }}
            >
              <Circle
                className={`
                  w-6 h-6 transition-colors
                  ${isFilled ? "fill-[#595959] text-[#595959]" : "text-muted-foreground/20"}
                `}
              />
            </button>
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
