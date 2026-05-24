import { cn } from "@/lib/utils";

export interface FeedEditorialEyebrowProps {
  /** Uppercase contextual segment — city, tags, typology, etc. */
  contextLabel?: string | null;
  architect?: string | null;
  year?: string | number | null;
  className?: string;
}

/**
 * Editorial eyebrow above the feed title — matches `FeedPage.jsx` kit.
 * Format: CONTEXT / Architect · Year
 */
export function FeedEditorialEyebrow({
  contextLabel,
  architect,
  year,
  className,
}: FeedEditorialEyebrowProps) {
  const hasArchitectYear = Boolean(architect || year != null);
  if (!contextLabel && !hasArchitectYear) return null;

  return (
    <p
      className={cn(
        "mb-[14px] text-[11px] font-medium uppercase tracking-[0.15em] text-text-secondary",
        className,
      )}
    >
      {contextLabel ? <span>{contextLabel}</span> : null}
      {contextLabel && hasArchitectYear ? (
        <span className="mx-1.5 text-text-disabled" aria-hidden>
          /
        </span>
      ) : null}
      {hasArchitectYear ? (
        <span className="text-text-primary">
          {[architect, year != null ? String(year) : null].filter(Boolean).join(" · ")}
        </span>
      ) : null}
    </p>
  );
}
