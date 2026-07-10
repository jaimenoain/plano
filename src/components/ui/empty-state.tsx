import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /**
   * The quiet uppercase label — rendered through the `.eyebrow` utility. This is
   * the empty state's headline: a short noun phrase ("Nothing here yet",
   * "No collections"), never a full sentence.
   */
  eyebrow: string;
  /** One imperative sentence of guidance. */
  message?: ReactNode;
  /**
   * A single call to action. Pass one `<Link className="cta-link">` (preferred)
   * or one primary `<Button>` — never both, never a row of buttons.
   */
  action?: ReactNode;
  /**
   * Optional monospace caption. When set, a `.photo-placeholder` visual renders
   * above the copy — the only sanctioned "image" for an empty slot. Omit it for
   * the default text-only composition.
   */
  photoLabel?: string;
  /**
   * `"inverse"` renders white-tinted copy for a dark/inverse surface (e.g. the
   * Explore stage). Defaults to `"default"` — dark ink on a light surface.
   */
  tone?: "default" | "inverse";
  className?: string;
}

/**
 * The canonical empty state — a quiet uppercase eyebrow, one imperative
 * sentence, and one `.cta-link` (or primary button). Deliberately has **no
 * icon, no blank/dashed panel, and no illustration**: those are the three things
 * the design system's empty-state recipe forbids (PATTERNS.md · "Empty states").
 * If a visual is genuinely needed, pass `photoLabel` to render a
 * `.photo-placeholder` instead of a spot illustration.
 */
export function EmptyState({
  eyebrow,
  message,
  action,
  photoLabel,
  tone = "default",
  className,
}: EmptyStateProps) {
  const inverse = tone === "inverse";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-20 text-center",
        className,
      )}
    >
      {photoLabel && (
        <div
          className="photo-placeholder aspect-4/3 w-full max-w-xs"
          data-label={photoLabel}
          aria-hidden
        />
      )}
      <p className={cn("eyebrow", inverse && "text-white/40")}>{eyebrow}</p>
      {message && (
        <p
          className={cn(
            "max-w-sm text-sm leading-relaxed",
            inverse ? "text-white/60" : "text-text-secondary",
          )}
        >
          {message}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
