import type { MetaFunction } from "react-router";
import { FeedbackBoard } from "@/features/admin/components/FeedbackBoard";
import { AdminPageHeader } from "@/features/admin/components/admin-ui";

export const meta: MetaFunction = () => [{ title: "Admin Feedback | Plano" }];

export default function FeedbackAdminPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Content"
        title="Feedback"
        description="Review and triage user feedback."
      />
      <FeedbackBoard readOnly={false} />
    </div>
  );
}
