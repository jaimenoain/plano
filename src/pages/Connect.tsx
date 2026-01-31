import { AppLayout } from "@/components/layout/AppLayout";
import { PeopleYouMayKnow } from "@/components/connect/PeopleYouMayKnow";
import { YourContacts } from "@/components/connect/YourContacts";
import GroupsView from "@/components/groups/GroupsView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Connect() {
  return (
    <AppLayout title="Connect" showLogo={false}>
      <div className="w-full pb-20">
        <Tabs defaultValue="people" className="w-full">
          <div className="px-4 pt-6 max-w-6xl mx-auto">
             <TabsList className="grid w-full grid-cols-2 max-w-[400px] mx-auto">
                <TabsTrigger value="people">People</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
             </TabsList>
          </div>

          <TabsContent value="people" className="mt-0">
            <div className="px-4 py-6 max-w-6xl mx-auto space-y-10">
               <PeopleYouMayKnow />
               <YourContacts />
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-0">
            <GroupsView />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
