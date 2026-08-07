/**
 * CollectionMemberFilter.tsx
 *
 * "Apply to specific members only" filter inside the Markers tab's Status /
 * Member Ratings sub-options. Lets an editor scope categorisation to a subset
 * of the collection's members — owner included, since the owner's status and
 * ratings count toward categorisation just like a collaborator's do.
 * Extracted from CollectionSettingsDialog to keep that file under its size
 * budget.
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CollectionOwnerProfile } from "../api/collaboration";

interface Contributor {
  user_id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface CollectionMemberFilterProps {
  ownerId: string;
  owner: CollectionOwnerProfile | undefined;
  contributors: Contributor[];
  /** `null` = every member; an array (possibly empty) = only these member ids. */
  selectedMemberIds: string[] | null;
  onToggleScope: (applyToSpecificMembers: boolean) => void;
  onToggleMember: (userId: string) => void;
}

export function CollectionMemberFilter({
  ownerId,
  owner,
  contributors,
  selectedMemberIds,
  onToggleScope,
  onToggleMember,
}: CollectionMemberFilterProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">Member Filter</Label>
      <div className="flex items-center space-x-2 mt-1">
        <Checkbox
          id="specific-members"
          checked={selectedMemberIds !== null}
          onCheckedChange={(checked) => onToggleScope(!!checked)}
        />
        <Label htmlFor="specific-members" className="text-sm font-normal cursor-pointer">Apply to specific members only</Label>
      </div>

      {selectedMemberIds !== null && (
        <ScrollArea className="h-[150px] border rounded-none p-2 bg-surface-muted/5">
          <div className="space-y-2">
            {owner && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`member-${ownerId}`}
                  checked={selectedMemberIds.includes(ownerId)}
                  onCheckedChange={() => onToggleMember(ownerId)}
                />
                <Label htmlFor={`member-${ownerId}`} className="font-normal cursor-pointer text-sm">
                  {owner.username}
                  <span className="ml-1 text-xs text-text-secondary">(Owner)</span>
                </Label>
              </div>
            )}
            {contributors.map(c => {
              if (!c.user) return null;
              return (
                <div key={c.user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`member-${c.user.id}`}
                    checked={selectedMemberIds.includes(c.user.id)}
                    onCheckedChange={() => onToggleMember(c.user.id)}
                  />
                  <Label htmlFor={`member-${c.user.id}`} className="font-normal cursor-pointer text-sm">
                    {c.user.username}
                  </Label>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
