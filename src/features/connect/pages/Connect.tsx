import { AppLayout } from "@/components/layout/AppLayout";
import { PeopleYouMayKnow } from "@/features/connect/components/PeopleYouMayKnow";
import { YourContacts } from "@/features/connect/components/YourContacts";
import { cn } from "@/lib/utils";

export default function Connect() {
  return (
    <div className={cn("w-full transition-[padding] duration-200 ease-linear", "md:pl-52")}>
      <AppLayout title="Connect" showLogo={false}>
        <div className="w-full pb-20">
          <div className="px-4 py-6 max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary">
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
