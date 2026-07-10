import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RatingDots } from "@/components/ui/rating-dots";
import { MichelinRatingInput } from "@/components/ui/michelin-rating-input";

interface InlineRatingProps {
  rating: number | null;
  onRate: (rating: number | null) => void;
  readOnly?: boolean;
}

export function InlineRating({ rating, onRate, readOnly = false }: InlineRatingProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Read-only display: show only earned dots (a reward, never empty rings).
  if (readOnly) {
    return <RatingDots rating={rating} size="md" />;
  }

  const hasRated = rating !== null && rating > 0;

  // "Interesting" (tier 0) is a real earned tier that renders as no dots, so it doubles as
  // the clear gesture the old three-slot picker offered on re-click.
  const handleChange = (value: number) => {
    onRate(value);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Set award rating"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-6 items-center rounded-sm px-1 transition-colors hover:bg-surface-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          {hasRated ? (
            <RatingDots rating={rating} size="md" />
          ) : (
            <span className="text-2xs font-medium uppercase tracking-widest text-text-disabled">
              Rate
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3"
        align="start"
        sideOffset={5}
        onClick={(e) => e.stopPropagation()}
      >
        <MichelinRatingInput value={rating ?? 0} onChange={handleChange} />
      </PopoverContent>
    </Popover>
  );
}
