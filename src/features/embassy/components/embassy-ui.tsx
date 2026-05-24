import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
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
        <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">{eyebrow}</p>
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
    <p className={cn("text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary", className)}>
      {children}
    </p>
  );
}

export const embassyTableHeadClass =
  "text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary font-normal";

export const EMBASSY_SKELETON_ROUNDED = "rounded-sm";

export function EmbassyEmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-sm border border-dashed border-border-default p-12 text-center">
      {icon ? <div className="flex justify-center text-text-secondary">{icon}</div> : null}
      <p className="text-lg font-medium text-text-primary">{title}</p>
      {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      {children}
    </div>
  );
}

export function EmbassyErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-border-default bg-feedback-destructive/5 p-8 text-center text-feedback-destructive">
      <AlertCircle className="mx-auto mb-2 h-8 w-8" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
