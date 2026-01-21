
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Star } from "lucide-react";

interface PersonalRatingButtonProps {
  buildingId: string;
  initialRating: number | null;
  onRate: (buildingId: string, rating: number) => void;
  isPending?: boolean;
  /**
   * Custom label text when no rating is set.
   * Defaults to "Rate".
   * Useful for distinguishing "Priority" context in Pending items vs "Rating" in Visited items.
   */
  label?: string;
}

export function PersonalRatingButton({
  buildingId,
  initialRating,
  onRate,
  isPending = false,
  label = "Rate"
}: PersonalRatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // If initialRating is provided, display it.
  const hasRated = initialRating !== null && initialRating > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasRated ? "default" : "ghost"}
          size="sm"
          className={`
            h-8 transition-all
            ${hasRated
              ? "bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary border-primary/20 border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }
          `}
        >
          {hasRated ? (
            <span className="flex items-center gap-1 font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              {initialRating}/5
            </span>
          ) : (
            <span className="text-xs">{label}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHoverRating(null)}
        >
          {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => {
            const isFilled = (hoverRating !== null ? star <= hoverRating : (initialRating || 0) >= star);

            return (
              <button
                key={star}
                type="button"
                disabled={isPending}
                className={`
                  p-1 rounded-sm transition-transform hover:scale-125 focus:outline-none
                  ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                `}
                onMouseEnter={() => setHoverRating(star)}
                onClick={() => {
                  onRate(buildingId, star);
                  setIsOpen(false);
                }}
              >
                <Star
                  className={`
                    w-5 h-5 transition-colors
                    ${isFilled ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}
                  `}
                />
              </button>
            );
          })}
        </div>
        <div className="text-center mt-2 text-xs font-medium text-muted-foreground h-4">
          {hoverRating ? `${hoverRating} / 5` : (initialRating ? `${initialRating} / 5` : `${label} this building`)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
