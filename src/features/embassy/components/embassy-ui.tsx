import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmbassyPageHeader({
  eyebrow = "Embassy",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="eyebrow tracking-widest">{eyebrow}</p>
        <h1 className="text-3xl font-bold tracking-tight leading-none text-text-primary">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmbassySectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("eyebrow tracking-widest", className)}>
      {children}
    </p>
  );
}

export const embassyTableHeadClass =
  "eyebrow tracking-widest font-normal";

export const EMBASSY_SKELETON_ROUNDED = "rounded-sm";

export function EmbassyEmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  // Canonical empty-state recipe (mirrors `components/ui/empty-state.tsx`):
  // quiet eyebrow + one sentence + a single action — no icon, no dashed panel.
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <p className="eyebrow">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-text-secondary">{description}</p>
      ) : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

export function EmbassyErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-border-default bg-feedback-destructive/5 p-8 text-center text-feedback-destructive">
      <p>{message}</p>
    </div>
  );
}
