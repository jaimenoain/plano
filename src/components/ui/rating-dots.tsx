import { cn } from "@/lib/utils";

const SIZE = {
  sm: "h-[9px] w-[9px]",
  md: "h-3 w-3",
  lg: "h-4 w-4",
} as const;

const TONE = {
  default: "bg-brand-primary",
  inverse: "bg-text-inverse",
} as const;

export interface RatingDotsProps {
  /** Awarded distinction, 0–3. `null`/`undefined`/0 render nothing. */
  rating: number | null | undefined;
  size?: keyof typeof SIZE;
  /** `inverse` = white dots, for dark surfaces (the kit's `.rdot.inv`). */
  tone?: keyof typeof TONE;
  className?: string;
}

/**
 * Award rating dots — a reward, not a scale (Michelin-style).
 *
 * Renders ONLY the earned dots (1–3 filled black circles); zero renders
 * nothing at all. Never empty/outlined rings, never "X out of 3" — that
 * manufactures a low-score reading the awards model exists to avoid. Dots are
 * `brand-primary` (black); lime has poor contrast on white and is not used here.
 * On an inverse surface (the Explore stage is pitch black) pass `tone="inverse"`
 * for white dots — `screens/explore.html` defines exactly this as `.rdot.inv`.
 * See docs/DESIGN_TOKENS.md and design-system/README.md.
 */
export function RatingDots({
  rating,
  size = "md",
  tone = "default",
  className,
}: RatingDotsProps) {
  const n = Math.max(0, Math.min(3, Math.round(rating ?? 0)));
  if (n <= 0) return null;

  return (
    <span
      role="img"
      aria-label={`${n} distinction${n > 1 ? "s" : ""}`}
      className={cn("inline-flex items-center gap-0.5 align-middle", className)}
    >
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn("shrink-0 rounded-full", TONE[tone], SIZE[size])}
        />
      ))}
    </span>
  );
}
