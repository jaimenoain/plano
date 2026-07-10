
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RatingDots } from "@/components/ui/rating-dots";
import { MichelinRatingInput } from "@/components/ui/michelin-rating-input";

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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  // If initialRating is provided, display it.
  const hasRated = initialRating !== null && initialRating > 0;

  // MichelinRatingInput's four tiers are discrete choices (0 = "Interesting" is a
  // real earned tier, not "unrated"), so there is no toggle-off-on-reclick affordance
  // here — that was specific to the old hand-rolled 3-circle picker's clear gesture.
  const handleChange = (value: number) => {
    onRate(buildingId, value);
    if (variant === 'popover') {
      setIsOpen(false);
    }
  };

  const ratingInput = (
    <MichelinRatingInput
      value={initialRating ?? 0}
      onChange={handleChange}
      disabled={isLoading}
    />
  );

  if (variant === 'inline') {
    return ratingInput;
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
        {ratingInput}
      </PopoverContent>
    </Popover>
  );
}
