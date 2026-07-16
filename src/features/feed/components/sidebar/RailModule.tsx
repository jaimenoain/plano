import type { ReactNode } from "react";

/**
 * Shared chrome for the feed sidebar rail.
 *
 * Every module below the passport is a `RailModule`: a hairline `border-t`
 * section on the rail's 36px rhythm. List modules share one row grammar —
 * a 13px semibold title, an 11px secondary meta line, and a Space Mono
 * figure in the margin — exported here as class constants.
 */

export const RAIL_ROW = "flex items-baseline gap-3 py-2.5";
export const RAIL_ROW_TITLE =
  "truncate text-[13px] font-semibold leading-snug text-text-primary";
export const RAIL_ROW_META = "mt-0.5 truncate text-[11px] text-text-secondary";
export const RAIL_ROW_FIGURE =
  "shrink-0 font-mono text-[11px] tracking-[0.04em] text-text-disabled";
export const RAIL_LIST_ITEM = "border-b border-border-default last:border-b-0";

export function RailModule({ children }: { children: ReactNode }) {
  return (
    <section className="border-t border-border-default pt-9">{children}</section>
  );
}

export function RailHeader({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] font-medium uppercase tracking-widest text-text-disabled">
        {label}
      </h2>
      {meta && (
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
          {meta}
        </span>
      )}
    </div>
  );
}

/** Square loading bars — the rail never rounds a skeleton corner. */
export function RailSkeletonRows({
  rows = 4,
  withThumb = false,
}: {
  rows?: number;
  withThumb?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 animate-pulse">
          {withThumb && <div className="h-12 w-12 shrink-0 bg-surface-muted" />}
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 bg-surface-muted" />
            <div className="h-2.5 w-1/3 bg-surface-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
