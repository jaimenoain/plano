import { cn } from "@/lib/utils";

export interface BuildingSubtitleProps {
  subTitle?: string;
  city?: string;
  className?: string;
}

/**
 * Architect credits, year, location — micro uppercase, joined with ·
 */
export function BuildingSubtitle({ subTitle, city, className }: BuildingSubtitleProps) {
  const parts = [subTitle, city].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p
      className={cn(
        "font-sans text-2xs tracking-[0.12em] uppercase text-text-secondary",
        className,
      )}
    >
      {parts.join(" · ")}
    </p>
  );
}
