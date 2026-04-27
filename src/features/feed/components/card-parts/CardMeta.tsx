import { cn } from "@/lib/utils";

export interface CardMetaProps {
  city?: string | null;
  architect?: string | null;
  year?: string | number | null;
  className?: string;
}

/**
 * Editorial metadata line: City · Architect · Year
 * Uses 10px uppercase tracked font-sans for names, and font-mono for technical data.
 */
export function CardMeta({ city, architect, year, className }: CardMetaProps) {
  const hasContent = city || architect || year;
  if (!hasContent) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[10px] text-2xs font-medium uppercase tracking-[0.14em] text-text-secondary leading-none",
        className
      )}
    >
      {city && (
        <span className="flex items-center gap-[10px]">
          <span>{city}</span>
        </span>
      )}
      {city && architect && <span className="text-text-disabled">·</span>}
      {architect && (
        <span className="flex items-center gap-[10px]">
          <span>{architect}</span>
        </span>
      )}
      {(city || architect) && year && <span className="text-text-disabled">·</span>}
      {year && (
        <span className="font-mono tracking-normal text-text-secondary">
          {year}
        </span>
      )}
    </div>
  );
}
