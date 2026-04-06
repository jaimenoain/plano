import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [{ title: "System | Plano" }];

export default function AdminSystemPlaceholder() {
  return (
    <div className="rounded-md border border-border-default bg-surface-card p-8 text-text-secondary">
      System (coming soon)
    </div>
  );
}
