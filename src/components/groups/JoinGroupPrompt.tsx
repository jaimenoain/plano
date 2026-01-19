import { Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JoinGroupDialog } from "./JoinGroupDialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JoinGroupPrompt({ group }: { group: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-6 bg-muted/30 rounded-xl border border-dashed animate-in fade-in duration-500">
      <div className="bg-background p-4 rounded-full border shadow-sm">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="text-xl font-semibold">Members Only</h3>
        <p className="text-muted-foreground">
          You need to be a member of <span className="font-medium text-foreground">{group.name}</span> to view this content.
        </p>
      </div>
      <JoinGroupDialog
        group={group}
        trigger={
          <Button size="lg">
            <UserPlus className="mr-2 h-4 w-4" /> Request to Join
          </Button>
        }
      />
    </div>
  );
}
