import { Link, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedbackBoard } from "@/features/admin/components/FeedbackBoard";

export const meta: MetaFunction = () => [{ title: "Feedback | Plano" }];

export default function FeedbackHistoryPage() {
  return (
    <AppLayout showLogo={false}>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border-border-default pb-8">
          <p className="mb-3 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
            Your submissions
          </p>
          <h1 className="text-3xl font-bold tracking-tight leading-none text-text-primary sm:text-4xl">
            Feedback
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            Track the feedback you&apos;ve submitted.{" "}
            <Link
              to="/settings"
              className="text-text-primary underline-offset-2 hover:underline"
            >
              Settings
            </Link>
          </p>
        </header>
        <FeedbackBoard readOnly />
      </div>
    </AppLayout>
  );
}
