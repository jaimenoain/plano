/**
 * CollectionTopRatingLine.tsx
 *
 * "jaimenoain: Masterpiece ●●●" — the winning member rating for a building in
 * the collection list, shown when Member Ratings + "show the building's top
 * rating" are both on (Task 5.5). Composes the canonical award primitives —
 * never "X out of 3", never empty rings, never gold/silver/bronze hues.
 */
import { AWARD_TIERS } from "@/components/ui/michelin-rating-input";
import { RatingDots } from "@/components/ui/rating-dots";

interface CollectionTopRatingLineProps {
  username: string;
  rating: number;
}

export function CollectionTopRatingLine({ username, rating }: CollectionTopRatingLineProps) {
  const tier = AWARD_TIERS.find((t) => t.value === rating);
  if (!tier) return null;

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
      <span className="truncate">{username}: {tier.label}</span>
      <RatingDots rating={rating} size="sm" />
    </div>
  );
}
