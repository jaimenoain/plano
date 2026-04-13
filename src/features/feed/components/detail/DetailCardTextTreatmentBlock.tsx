import type { NavigateFunction } from "react-router";
import { cn } from "@/lib/utils";
import type { DetailCardTextTreatment } from "@/types/cards";
import type { FeedReview } from "@/types/feed";
import { formatDetailMediaMetadataLine } from "@/features/feed/utils/resolveCardType";

export interface DetailCardTextTreatmentBlockProps {
  entry: FeedReview;
  textTreatment: DetailCardTextTreatment;
  /** `true` = narrow text column beside media (24px quote / 3 lines); `false` = text-only card (32px / 4 lines). */
  narrowColumn: boolean;
  navigate: NavigateFunction;
}

/**
 * §4.4 copy tier: quote, body, or media-count metadata (`none` with media only).
 */
export function DetailCardTextTreatmentBlock({
  entry,
  textTreatment,
  narrowColumn,
  navigate,
}: DetailCardTextTreatmentBlockProps) {
  const raw = entry.content?.trim() ?? "";

  if (textTreatment === "none") {
    const line = formatDetailMediaMetadataLine(entry);
    if (!line) return null;
    return (
      <p className="max-w-full text-center font-mono text-[11px] tracking-[0.14em] uppercase text-text-secondary">
        {line}
      </p>
    );
  }

  if (textTreatment === "quote") {
    return (
      <div className="flex min-w-0 items-start gap-1">
        <span
          className="select-none font-serif text-[56px] leading-none text-border-default"
          aria-hidden
        >
          &ldquo;
        </span>
        <p
          className={cn(
            "min-w-0 flex-1 font-black leading-tight tracking-tight text-text-primary",
            narrowColumn ? "text-2xl line-clamp-3" : "line-clamp-4 text-[32px]",
          )}
        >
          {raw}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <p className="line-clamp-4 text-sm leading-[1.7] text-text-secondary">{raw}</p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/review/${entry.id}`);
        }}
        className="w-fit font-sans text-[9px] uppercase tracking-widest text-text-primary transition-colors hover:opacity-80"
      >
        Read full review →
      </button>
    </div>
  );
}
