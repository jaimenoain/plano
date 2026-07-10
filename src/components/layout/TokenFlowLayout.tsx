import type { ReactNode } from "react";
import { Link } from "react-router";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { cn } from "@/lib/utils";

export function TokenFlowLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-default px-4 py-8 safe-area-pt safe-area-pb">
      <PlanoLogo className="mb-6 shrink-0 text-2xl text-text-primary" />
      <div className="w-full max-w-md text-center">{children}</div>
    </div>
  );
}

export function TokenFlowHeadline({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-3 text-3xl font-bold tracking-tight leading-none text-text-primary">
      {children}
    </h1>
  );
}

export function TokenFlowMessage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mb-8 text-sm leading-relaxed text-text-secondary", className)}>{children}</p>
  );
}

const actionClass =
  "inline-block text-xs font-medium uppercase tracking-widest text-text-primary transition-opacity hover:opacity-70";

export function TokenFlowPrimaryLink({
  to,
  href,
  children,
}: {
  to?: string;
  href?: string;
  children: ReactNode;
}) {
  if (href) {
    return (
      <a href={href} className={actionClass}>
        {children}
      </a>
    );
  }
  if (to) {
    return (
      <Link to={to} className={actionClass}>
        {children}
      </Link>
    );
  }
  return null;
}

export function TokenFlowSecondaryLink({
  to,
  href,
  children,
}: {
  to?: string;
  href?: string;
  children: ReactNode;
}) {
  const secondaryClass =
    "mt-4 inline-block text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary";
  if (href) {
    return (
      <a href={href} className={secondaryClass}>
        {children}
      </a>
    );
  }
  if (to) {
    return (
      <Link to={to} className={secondaryClass}>
        {children}
      </Link>
    );
  }
  return null;
}
