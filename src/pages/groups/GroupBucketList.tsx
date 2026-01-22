import { useOutletContext } from "react-router-dom";
import { SmartBacklog } from "@/components/groups/watchlist/SmartBacklog";

export default function GroupBucketList() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { group } = useOutletContext<{ group: any }>();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 mb-2">
        <h2 className="text-2xl font-bold tracking-tight">Group Bucket List</h2>
        <p className="text-muted-foreground">
          Find the perfect building by seeing what everyone wants to visit.
        </p>
      </div>
      <SmartBacklog group={group} />
    </div>
  );
}
