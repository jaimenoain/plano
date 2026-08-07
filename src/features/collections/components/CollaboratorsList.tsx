/**
 * CollaboratorsList.tsx
 *
 * "Current Collaborators" block inside the collection settings Collaborators tab.
 * Shows the collection owner (labelled "Owner", display-only — no remove/leave
 * action ever) above the editor contributors. Extracted from CollectionSettingsDialog
 * to keep that file under its size budget.
 */
import { useQuery } from "@tanstack/react-query";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchCollectionOwnerProfile } from "../api/collaboration";

export interface Contributor {
  user_id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface CollaboratorsListProps {
  ownerId: string;
  contributors: Contributor[];
  loading: boolean;
  currentUserId?: string;
  isOwner?: boolean;
  onRemove: (userId: string) => void;
  onLeave: () => void;
}

export function CollaboratorsList({
  ownerId,
  contributors,
  loading,
  currentUserId,
  isOwner,
  onRemove,
  onLeave,
}: CollaboratorsListProps) {
  const { data: owner, isLoading: loadingOwner } = useQuery({
    queryKey: ["profile-by-id", ownerId],
    queryFn: () => fetchCollectionOwnerProfile(ownerId),
    enabled: !!ownerId,
  });

  const isLoading = loading || loadingOwner;

  return (
    <div className="space-y-2">
      <Label>Current Collaborators</Label>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
        </div>
      ) : (
        <ScrollArea className="h-[200px] border rounded-none">
          <div className="divide-y">
            {owner && (
              <div key={owner.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={owner.avatar_url || undefined} />
                    <AvatarFallback>{owner.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {owner.username}
                    <span className="ml-2 text-xs text-text-secondary">
                      Owner{currentUserId === owner.id ? " · You" : ""}
                    </span>
                  </span>
                </div>
              </div>
            )}
            {contributors.length === 0 ? (
              <p className="text-center py-8 text-text-secondary text-sm">
                No collaborators yet.
              </p>
            ) : (
              contributors.map(contributor => {
                if (!contributor.user) return null;
                const isMe = currentUserId === contributor.user.id;
                return (
                  <div key={contributor.user.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={contributor.user.avatar_url || undefined} />
                        <AvatarFallback>{contributor.user.username?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {contributor.user.username}
                        {isMe && <span className="ml-2 text-xs text-text-secondary">(You)</span>}
                      </span>
                    </div>
                    {isOwner && !isMe && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-secondary hover:text-feedback-destructive"
                        onClick={() => onRemove(contributor.user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    {isMe && !isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-secondary hover:text-feedback-destructive"
                        onClick={onLeave}
                        title="Leave Collection"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
