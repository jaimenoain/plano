import type { MetaFunction } from "react-router";
import { FeedbackBoard } from "@/features/admin/components/FeedbackBoard";

export const meta: MetaFunction = () => [{ title: "Admin Feedback | Plano" }];

export default function FeedbackAdminPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Feedback</h1>
        <p className="text-sm text-text-secondary">
          Review and triage user feedback.
        </p>
      </div>
      <FeedbackBoard readOnly={false} />
    </div>
  );
}
