import { cn } from "@/lib/utils";

export interface CardMetaProps {
  city?: string | null;
  architect?: string | null;
  year?: string | number | null;
  className?: string;
}

/**
 * BuildingAbove — the subdued metadata line that appears above the feed title.
 * 13px normal weight, slight negative tracking — contextual, never competing with the headline.
 */
export function CardMeta({ city, architect, year, className }: CardMetaProps) {
  const parts = [
    city || null,
    architect || null,
    year != null ? String(year) : null,
  ].filter(Boolean) as string[];

  if (parts.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[10px] text-[13px] font-normal tracking-[-0.005em] text-text-secondary leading-none",
        className,
      )}
    >
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-[10px]">
          {i > 0 && <span className="text-text-disabled" aria-hidden>·</span>}
          <span>{part}</span>
        </span>
      ))}
    </div>
  );
}
