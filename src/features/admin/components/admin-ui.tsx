import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow = "Admin",
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
        <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">{eyebrow}</p>
        <h1 className="text-3xl font-bold tracking-tight leading-none text-text-primary">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminSectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-2xs font-medium uppercase tracking-widest text-text-secondary", className)}>
      {children}
    </h2>
  );
}

export function AdminFormLabel({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-2xs font-medium uppercase tracking-widest text-text-secondary", className)}
    >
      {children}
    </label>
  );
}

export const adminTableHeadClass =
  "text-2xs font-medium uppercase tracking-widest text-text-secondary font-normal";

/** Hairline tab strip — use on `TabsList` + `TabsTrigger` in admin operational pages. */
export const adminHairlineTabsListClass =
  "h-auto rounded-none border-0 bg-transparent p-0";

export const adminHairlineTabTriggerClass =
  "rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-2xs font-medium uppercase tracking-widest text-text-secondary data-[state=active]:border-text-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none";

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-sm border border-dashed border-border-default p-12 text-center">
      <p className="font-medium text-text-primary">{title}</p>
      {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
    </div>
  );
}

export function AdminErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-border-default bg-feedback-destructive/5 p-8 text-center text-feedback-destructive">
      <AlertCircle className="mx-auto mb-2 h-8 w-8" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
