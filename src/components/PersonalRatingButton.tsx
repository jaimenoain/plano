
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Star } from "lucide-react";

export type BuildingStatus = 'pending' | 'visited' | 'ignored' | null;

interface PersonalRatingButtonProps {
  buildingId: string;
  initialRating: number | null;
  onRate: (buildingId: string, rating: number) => void;
  status?: BuildingStatus; // Changed from isPending
  isPending?: boolean; // Keep for backward compatibility if needed, or map to status
  label?: string;
  /**
   * Optional callback to be notified when the popover opens/closes
   */
  onOpenChange?: (open: boolean) => void;
}

export function PersonalRatingButton({
  buildingId,
  initialRating,
  onRate,
  status = 'visited', // Default to visited context if not provided
  isPending = false, // Legacy prop
  label = "Rate",
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

  // Determine context for tooltips
  // "pending" -> Priority context
  // "visited" (or others) -> Quality context
  // Use status prop if provided, otherwise fallback to legacy isPending logic (if isPending is used as a boolean flag for loading, ignore it for context. But here isPending was likely used for "in wishlist")
  // Actually, looking at previous code, isPending was `rateBuilding.isPending` which means LOADING state.
  // The prompt says: "Modify this component to be 'Status Aware'. It must accept a status prop... indicates if the building is pending or visited."
  // So I should treat `status` as the context source.
  // And `isPending` prop in the old code was actually used for disabled state (loading).
  // So I should rename `isPending` to `isLoading` or similar to avoid confusion, but to keep compatibility I will use `isLoading`.

  const isLoading = isPending; // Alias for clarity
  const contextStatus = status;

  const isPriorityContext = contextStatus === 'pending';

  const getRatingLabel = (rating: number) => {
    if (isPriorityContext) {
      switch (rating) {
        case 1: return "Low priority";
        case 2: return "Backup";
        case 3: return "Interested";
        case 4: return "High priority";
        case 5: return "Must visit"; // Critical
        default: return `${rating} Stars`;
      }
    } else {
      // Quality context (Visited)
      switch (rating) {
        case 1: return "Disappointing";
        case 2: return "Below Average";
        case 3: return "Good";
        case 4: return "Great";
        case 5: return "Masterpiece";
        default: return `${rating} Stars`;
      }
    }
  };

  const currentLabel = hoverRating
    ? getRatingLabel(hoverRating)
    : (initialRating ? getRatingLabel(initialRating) : `${label} this building`);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={hasRated ? "default" : "ghost"}
          size="sm"
          className={`
            h-8 transition-all gap-1.5
            ${hasRated
              ? "bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary border-primary/20 border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }
          `}
        >
          {hasRated ? (
            <>
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-bold">{initialRating}/5</span>
            </>
          ) : (
            <span className="text-xs">{label}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="center" sideOffset={5}>
        <div className="flex flex-col items-center gap-2">
            <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHoverRating(null)}
            >
            {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => {
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
                    <Star
                    className={`
                        w-6 h-6 transition-colors
                        ${isFilled ? "fill-primary text-primary" : "text-muted-foreground/20"}
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
      </PopoverContent>
    </Popover>
  );
}
