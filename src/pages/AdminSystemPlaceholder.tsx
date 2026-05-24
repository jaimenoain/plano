import type { MetaFunction } from "react-router";
import {
  AdminEmptyState,
  AdminPageHeader,
} from "@/features/admin/components/admin-ui";

export const meta: MetaFunction = () => [{ title: "System | Plano" }];

export default function AdminSystemPlaceholder() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="System"
        title="System"
        description="Platform configuration and tooling."
      />
      <AdminEmptyState title="Coming soon" />
    </div>
  );
}
