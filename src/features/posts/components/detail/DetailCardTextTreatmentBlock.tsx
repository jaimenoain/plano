import type { NavigateFunction } from "react-router";
import { cn } from "@/lib/utils";
import type { DetailCardTextTreatment } from "@/types/cards";
import type { FeedReview } from "@/types/feed";

/** Strip one pair of wrapping straight or curly double quotes from user-supplied copy. */
function displayReviewText(raw: string): string {
  const s = raw.trim();
  if (s.length >= 2) {
    const a = s[0];
    const b = s[s.length - 1];
    if (
      (a === '"' && b === '"') ||
      (a === "\u201c" && b === "\u201d") ||
      (a === "\u201e" && b === "\u201c")
    ) {
      return s.slice(1, -1).trim();
    }
  }
  return s;
}

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
  const text = displayReviewText(raw);

  if (textTreatment === "none") {
    return null;
  }

  if (textTreatment === "quote") {
    return (
      <p
        className={cn(
          "min-w-0 font-black leading-tight tracking-tight text-text-primary",
          narrowColumn ? "text-2xl line-clamp-3" : "line-clamp-4 text-[32px]",
        )}
      >
        {text}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <p className="line-clamp-4 text-sm leading-[1.7] text-text-secondary">{text}</p>
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
