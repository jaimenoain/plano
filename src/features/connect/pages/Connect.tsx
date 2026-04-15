import { type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PeopleYouMayKnow } from "@/features/connect/components/PeopleYouMayKnow";
import { YourContacts } from "@/features/connect/components/YourContacts";

export const meta: MetaFunction = () => [
  { title: "Connect | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function Connect() {
  return (
    <div className="w-full">
      <AppLayout title="Connect" showLogo={false}>
        <div className="w-full pb-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* ── Editorial page heading ── */}
            <div className="pt-10 pb-10 border-b border-border-default">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary leading-none">
                Connect
              </h1>
            </div>

            {/* ── Suggestions ── */}
            <section className="py-12 border-b border-border-default">
              <PeopleYouMayKnow />
            </section>

            {/* ── Contacts ── */}
            <section className="py-12">
              <YourContacts />
            </section>

          </div>
        </div>
      </AppLayout>
    </div>
  );
}