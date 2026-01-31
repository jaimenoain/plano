import { AppLayout } from "@/components/layout/AppLayout";
import GroupsView from "@/components/groups/GroupsView";

export default function Groups() {
  return (
    <AppLayout title="Groups" showLogo={false}>
      <GroupsView />
    </AppLayout>
  );
}
