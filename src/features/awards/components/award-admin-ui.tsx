import type { ReactNode } from "react";

export function AwardAdminPageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="eyebrow tracking-widest">
          Award administration
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">{title}</h1>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export const awardAdminTableHeadClass =
  "eyebrow tracking-widest font-normal";

export function outcomeBadgeClassName(outcome: string): string {
  const normalized = outcome.replace(/_/g, " ");
  if (normalized === "winner") {
    return "border-border-default bg-surface-card text-text-primary";
  }
  if (normalized === "honorable mention" || normalized === "honourable mention") {
    return "border-border-default bg-surface-muted text-text-secondary";
  }
  return "border-transparent bg-surface-muted text-text-secondary";
}
