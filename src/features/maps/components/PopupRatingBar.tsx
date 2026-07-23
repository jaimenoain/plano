import { Bookmark, Check } from "lucide-react";

/**
 * The post-interaction rating strip shown inside the map hover popup after a
 * save/visit. Extracted from `BuildingPopupContent` (extract-on-touch) so the
 * popup file stays under its size budget. Pure presentational — all state and
 * the rate handler come from the parent's `useBuildingStatusActions`.
 */
export function PopupRatingBar({
  justInteracted,
  currentRating,
  hoverRating,
  setHoverRating,
  onRate,
}: {
  justInteracted: string | null;
  currentRating: number;
  hoverRating: number | null;
  setHoverRating: (rating: number | null) => void;
  onRate: (rating: number) => void;
}) {
  if (!justInteracted) return null;
  return (
    <div
      className="flex justify-center items-center gap-3 pt-3 pb-1 border-t animate-in fade-in slide-in-from-top-1 duration-300 relative z-20"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Status Indicator Circle */}
      <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center text-brand-primary-foreground">
        {justInteracted === "saved" ? (
          <Bookmark className="h-4 w-4 fill-current" />
        ) : (
          <Check className="h-5 w-5 stroke-[3px]" />
        )}
      </div>

      {/* Rating Circles */}
      {[1, 2, 3].map((rating) => {
        const activeRating = hoverRating !== null ? hoverRating : currentRating;
        const isFilled = activeRating >= rating;

        return (
          <div
            key={rating}
            className="p-1 -m-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onRate(rating);
            }}
            onMouseEnter={() => setHoverRating(rating)}
            onMouseLeave={() => setHoverRating(null)}
          >
            <div
              className={`
                h-8 w-8 rounded-full transition-all duration-200
                flex items-center justify-center border
                ${isFilled
                  ? "bg-text-primary border-text-primary"
                  : "bg-transparent border-border-default hover:border-border-strong"
                }
              `}
            />
          </div>
        );
      })}
    </div>
  );
}
