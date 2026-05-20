import { Link, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedbackBoard } from "@/features/admin/components/FeedbackBoard";

export const meta: MetaFunction = () => [{ title: "Feedback | Plano" }];

export default function FeedbackHistoryPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Feedback</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track the feedback you've submitted.{" "}
            <Link to="/settings" className="text-brand-primary hover:underline">
              Settings
            </Link>
          </p>
        </div>
        <FeedbackBoard readOnly />
      </div>
    </AppLayout>
  );
}
