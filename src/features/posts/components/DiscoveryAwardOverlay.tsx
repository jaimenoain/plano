import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { RatingDots } from "@/components/ui/rating-dots";
import { AWARD_TIERS } from "@/components/ui/michelin-rating-input";

/**
 * The swipe-save prompt offers "save without rating" (null — leaves `rating` unset)
 * plus the three earned award tiers. Tier 0 "Interesting" is omitted because it renders
 * no dots and so would be indistinguishable from the save option beside it.
 */
const RATING_OPTIONS: ReadonlyArray<{ value: number | null; label: string }> = [
  { value: null, label: "Save" },
  ...AWARD_TIERS.filter((tier) => tier.value > 0).map((tier) => ({
    value: tier.value as number,
    label: tier.label as string,
  })),
];

interface DiscoveryAwardOverlayProps {
  /** Currently chosen award, or `null` for save-without-rating. */
  rating: number | null;
  onRate: (value: number | null, e: React.MouseEvent) => void;
  onSkip: (e: React.MouseEvent) => void;
}

/**
 * The award prompt shown after a save on the Explore card.
 *
 * Named tiers, each with only its own earned dots — never the bare numerals 1/2/3,
 * which manufacture the "X out of 3" score the award model exists to avoid. The stage
 * is black, so dots invert to white (the kit's `.rdot.inv`).
 */
export function DiscoveryAwardOverlay({
  rating,
  onRate,
  onSkip,
}: DiscoveryAwardOverlayProps) {
  return (
    <motion.div
      data-explore-overlay="open"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-end pb-20 sm:pb-24 bg-black/85"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-2xs font-medium tracking-widest uppercase text-white/60 mb-10">
        Add an award (optional)
      </p>

      <div className="flex items-end gap-8 sm:gap-12">
        {RATING_OPTIONS.map((option) => {
          const isSelected = rating === option.value;
          return (
            <button
              key={option.value ?? "save"}
              onClick={(e) => onRate(option.value, e)}
              aria-label={option.label}
              className={`flex flex-col items-center gap-3 transition-all duration-200 ${
                isSelected ? "scale-110" : "hover:scale-105"
              }`}
            >
              <span className="flex h-10 items-center justify-center">
                {option.value === null ? (
                  <Bookmark
                    className={`w-9 h-9 transition-colors ${
                      isSelected ? "text-white" : "text-white/70"
                    }`}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />
                ) : (
                  <RatingDots
                    rating={option.value}
                    size="lg"
                    tone="inverse"
                    className={`gap-1 transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-70"
                    }`}
                  />
                )}
              </span>
              <span
                className={`text-2xs font-medium uppercase tracking-widest transition-colors ${
                  isSelected ? "text-white" : "text-white/55"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* `.cta-link` injects the arrow and its lime hover — the one sanctioned lime on
          this surface (kit `.exp-act:hover .ar`). */}
      <button
        className="cta-link mt-12 text-white/50 hover:text-white/80"
        onClick={onSkip}
      >
        Next building
      </button>
    </motion.div>
  );
}
