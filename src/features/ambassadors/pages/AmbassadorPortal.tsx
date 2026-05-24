import { redirect, type MetaFunction } from "react-router";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AmbassadorMarketingEyebrow } from "@/features/ambassadors/components/ambassador-marketing-ui";

export const meta: MetaFunction = () => [
  { title: "Ambassador portal | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

/** Canonical entry for ambassadors — redirects to Embassy Contribute. */
export async function loader() {
  return redirect("/embassy/contribute");
}

/** Fallback if the loader does not run (e.g. client-only navigation edge cases). */
export default function AmbassadorPortal() {
  return (
    <AppLayout title="Ambassador portal" showBack>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center space-y-4">
        <AmbassadorMarketingEyebrow>Embassy</AmbassadorMarketingEyebrow>
        <p className="text-sm text-text-secondary">Opening your ambassador workspace…</p>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-secondary" aria-hidden />
      </div>
    </AppLayout>
  );
}
