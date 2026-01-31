import { AppLayout } from "@/components/layout/AppLayout";
import { PeopleYouMayKnow } from "@/components/connect/PeopleYouMayKnow";
import { YourContacts } from "@/components/connect/YourContacts";

export default function Connect() {
  return (
    <AppLayout title="Connect" showLogo={false}>
      <div className="px-4 py-6 max-w-6xl mx-auto space-y-10">
        <PeopleYouMayKnow />
        <YourContacts />
      </div>
    </AppLayout>
  );
}
