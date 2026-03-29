import { AppLayout } from "@/components/layout/AppLayout";
import { PeopleYouMayKnow } from "@/components/connect/PeopleYouMayKnow";
import { YourContacts } from "@/components/connect/YourContacts";
import { cn } from "@/lib/utils";

export default function Connect() {
  return (
    <div className={cn("w-full transition-[padding] duration-200 ease-linear", "md:pl-52")}>
      <AppLayout title="Connect" showLogo={false}>
        <div className="w-full pb-20">
          <div className="px-4 py-6 max-w-6xl mx-auto space-y-10">
            <PeopleYouMayKnow />
            <YourContacts />
          </div>
        </div>
      </AppLayout>
    </div>
  );
}
