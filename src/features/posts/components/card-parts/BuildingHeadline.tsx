import { cn } from "@/lib/utils";

export interface BuildingHeadlineProps {
  name: string;
  size: "xl" | "lg" | "md";
  className?: string;
}

const sizeClass: Record<BuildingHeadlineProps["size"], string> = {
  /** clamp(48px→72px) — FeedCardA editorial headline */
  xl: "text-[clamp(3rem,6vw,4.5rem)] leading-[0.95] line-clamp-2",
  /** clamp(36px→48px) — FeedCardB split headline */
  lg: "text-[clamp(2.25rem,4vw,3rem)] leading-[0.95] line-clamp-2",
  /** 28px — single-line clamp (e.g. FeedCardC) */
  md: "text-[1.75rem] line-clamp-1",
};

/**
 * Building title at editorial scale steps; bold display sans, tight tracking.
 */
export function BuildingHeadline({ name, size, className }: BuildingHeadlineProps) {
  return (
    <h2
      className={cn(
        "font-sans font-bold tracking-[-0.035em] text-text-primary",
        sizeClass[size],
        className,
      )}
    >
      {name}
    </h2>
  );
}
