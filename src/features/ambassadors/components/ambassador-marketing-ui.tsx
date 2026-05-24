import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AmbassadorMarketingEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">{children}</p>
  );
}

export function AmbassadorMarketingSection({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-border-default pt-10 space-y-4", className)}>
      {eyebrow ? <AmbassadorMarketingEyebrow>{eyebrow}</AmbassadorMarketingEyebrow> : null}
      <h2 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function AmbassadorMarketingLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary"
    >
      {children}
    </label>
  );
}
