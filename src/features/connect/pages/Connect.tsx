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
        <div className="w-full pb-20">
          <div className="px-4 py-6 max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Connect
            </h1>

            <section className="mt-12 pt-8 border-t border-border-default">
              <PeopleYouMayKnow />
            </section>

            <section className="mt-12 pt-8 border-t border-border-default">
              <YourContacts />
            </section>
          </div>
        </div>
      </AppLayout>
    </div>
  );
}
