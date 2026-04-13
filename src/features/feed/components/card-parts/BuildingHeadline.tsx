import { cn } from "@/lib/utils";

export interface BuildingHeadlineProps {
  name: string;
  size: "xl" | "lg" | "md";
  className?: string;
}

const sizeClass: Record<BuildingHeadlineProps["size"], string> = {
  /** 52px (`3.25rem`) — FeedCardA editorial headline */
  xl: "text-[3.25rem] line-clamp-2",
  /** 36px */
  lg: "text-[2.25rem] line-clamp-2",
  /** 28px — single-line clamp (e.g. FeedCardC) */
  md: "text-[1.75rem] line-clamp-1",
};

/**
 * Building title at fixed scale steps; aggressive display sans, tight tracking.
 */
export function BuildingHeadline({ name, size, className }: BuildingHeadlineProps) {
  return (
    <h2
      className={cn(
        "font-sans font-black tracking-tight leading-none text-text-primary",
        sizeClass[size],
        className,
      )}
    >
      {name}
    </h2>
  );
}
