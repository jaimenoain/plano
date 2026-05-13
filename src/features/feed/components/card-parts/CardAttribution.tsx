import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardAttributionKind = "direct" | "extended" | "open" | "editorial";

export interface CardAttributionProps {
  kind: CardAttributionKind;
  text: string;
  icon?: ReactNode;
  className?: string;
}

/**
 * Single-line "why am I seeing this" label rendered above or below card media.
 *
 * Phase 0 introduces the primitive. Today every card already renders an
 * equivalent attribution line via `CardAuthor` (ring='direct'); this component
 * is the canonical renderer those slots will route through as the ranker and
 * extra rings come online in later phases.
 */
export function CardAttribution({
  kind,
  text,
  icon,
  className,
}: CardAttributionProps) {
  return (
    <span
      data-attribution-kind={kind}
      className={cn(
        "inline-flex items-center gap-1 text-[14px] leading-none text-text-disabled",
        className,
      )}
    >
      {icon && (
        <span aria-hidden className="inline-flex items-center">
          {icon}
        </span>
      )}
      <span>{text}</span>
    </span>
  );
}
