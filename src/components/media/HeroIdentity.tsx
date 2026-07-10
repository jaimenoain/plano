import type { ReactNode } from "react";

/**
 * Layout-only wrapper for the identity block overlaid on an {@link EntityHero}
 * band. Enforces the shared light-on-dark overlay shape (`space-y-3
 * text-text-inverse`) while each entity supplies its own content — badges/eyebrow
 * → white `headline`/`display` → credits.
 */
export function HeroIdentity({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-text-inverse">{children}</div>;
}
