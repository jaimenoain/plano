import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The catalogue's error composition — the non-404 sibling of `NotFoundView`,
 * following the same design-system `screens/states.html` (error) recipe: a mono
 * `ERROR · {code}` eyebrow, a big `.display` headline, one catalogue-voice
 * sentence, and one or two actions. **No illustration** — the design system
 * forbids spot graphics on empty/error states, so the boundaries that used a
 * lucide `AlertTriangle` are routed through this instead.
 *
 * The `actions` slot is caller-owned because each boundary wires different
 * recovery affordances (reload, revalidate, history-back). `heightClassName`
 * lets a full-screen boundary (`min-h-screen`) and an inline one (`h-[60vh]`)
 * share the same composition.
 */
export interface ErrorViewProps {
  /** The mono eyebrow code, e.g. `"500"`. Rendered as `ERROR · {code}`. */
  code?: string;
  /** The `.display` headline — terse, catalogue voice ("Something broke."). */
  headline: string;
  /** One catalogue-voice sentence of guidance. */
  message: ReactNode;
  /** The recovery affordances — one or two `<Button>`s, never a row. */
  actions: ReactNode;
  /** Vertical footprint of the centring shell. Defaults to `min-h-screen`. */
  heightClassName?: string;
}

export function ErrorView({
  code = "500",
  headline,
  message,
  actions,
  heightClassName = "min-h-screen",
}: ErrorViewProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center bg-surface-default px-8 py-16",
        heightClassName,
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <p className="meta-code text-text-disabled">ERROR · {code}</p>
        <h1 className="display">{headline}</h1>
        <p className="max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
          {message}
        </p>
        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          {actions}
        </div>
      </div>
    </div>
  );
}
