import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RatingDots } from "@/components/ui/rating-dots";

export interface MichelinRatingInputProps {
  /** Current award, 0–3 (0 = Interesting, the default). */
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * The four award tiers form an ascending ladder of merit — no rung reads as a
 * failure. Each choice shows only its own earned dots (0/1/2/3).
 */
const TIERS = [
  { value: 0, label: "Interesting", hint: "Worth a look" },
  { value: 1, label: "Impressive", hint: "Worth a detour" },
  { value: 2, label: "Essential", hint: "Worth a journey" },
  { value: 3, label: "Masterpiece", hint: "Once in a lifetime" },
] as const;

/**
 * Award rating input — a reward, not a scale (Michelin-style).
 *
 * Presents the four tiers as discrete, labelled choices, each rendered with
 * ONLY its own filled black dots, defaulting to Interesting. It is deliberately
 * NOT three toggle slots that fill left-to-right — that manufactures the exact
 * "X out of 3" reading the awards model exists to avoid.
 * See docs/DESIGN_TOKENS.md and design-system/README.md.
 */
export function MichelinRatingInput({
  value,
  onChange,
  className,
  disabled,
}: MichelinRatingInputProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Award rating"
      className={cn("flex flex-col gap-1", className)}
    >
      {TIERS.map((tier) => {
        const selected = value === tier.value;

        return (
          <motion.button
            key={tier.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            whileTap={disabled ? undefined : { scale: 0.98 }}
            onClick={() => !disabled && onChange(tier.value)}
            className={cn(
              "flex items-center justify-between gap-4 rounded-sm border px-3 py-2 text-left transition-colors",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-border-strong bg-surface-muted"
                : "border-border-default bg-surface-card hover:bg-surface-muted",
            )}
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">{tier.label}</span>
              <span className="text-xs text-text-secondary">{tier.hint}</span>
            </span>
            <span className="flex h-4 min-w-[3.25rem] items-center justify-end">
              <RatingDots rating={tier.value} size="md" />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
