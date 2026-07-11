import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Editorial page head for add/edit building flows (matches SubmitEvent / building detail tone). */
export function BuildingPageHeader({
  eyebrow = "Building",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="space-y-2">
      <p className="eyebrow tracking-widest">{eyebrow}</p>
      <h1 className="text-3xl font-bold tracking-tight leading-tight text-text-primary md:text-4xl">
        {title}
      </h1>
      {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
    </header>
  );
}

export function BuildingFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-4 border-t border-border-default pt-8 first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="eyebrow tracking-widest">{title}</h2>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function BuildingFormLabel({
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
      className={cn("eyebrow tracking-widest", className)}
    >
      {children}
    </label>
  );
}

/** Bordered panel for map + location controls (no Card shadow stack). */
export function BuildingFormPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-sm border border-border-default bg-surface-default", className)}>
      {title ? (
        <div className="border-b border-border-default px-4 py-3">
          <p className="eyebrow tracking-widest">{title}</p>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
