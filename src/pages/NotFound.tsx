import { AppLayout } from "@/components/layout/AppLayout";
import { NotFoundView } from "@/components/common/NotFoundView";
import { data, type MetaFunction } from "react-router";

/** Ensures crawlers and SEO checks see a real 404 status (not a soft 200). */
export function loader() {
  return data(null, { status: 404 });
}

export const meta: MetaFunction = () => [
  { title: "Page Not Found | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

const NotFound = () => (
  <AppLayout shellProvidesTopInset showHeader={false}>
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 md:py-24">
      <NotFoundView />
    </main>
  </AppLayout>
);

export default NotFound;
