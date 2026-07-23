/**
 * PendingCollaborationRequestsList.tsx
 *
 * Owner-only "Pending requests" block inside the collection settings Collaborators
 * tab. Lists people who asked to collaborate, with Accept (→ editor contributor) and
 * Reject actions. Renders nothing when there are no pending requests. Extracted from
 * CollectionSettingsDialog to keep that file under its size budget.
 */
import { Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  usePendingCollaborationRequests,
  useReviewCollaboration,
} from "../hooks/useCollectionCollaboration";

interface PendingCollaborationRequestsListProps {
  collectionId: string;
  /** Fetch/enable only for the owner while the sheet is open. */
  enabled: boolean;
  /** Called after a request is accepted so the parent can refresh its contributor list. */
  onAccepted: () => void;
}

export function PendingCollaborationRequestsList({
  collectionId,
  enabled,
  onAccepted,
}: PendingCollaborationRequestsListProps) {
  const { data: pendingRequests = [], refetch } = usePendingCollaborationRequests(
    collectionId,
    enabled,
  );
  const reviewCollaboration = useReviewCollaboration(collectionId);

  const handleReview = (requestId: string, approve: boolean) => {
    reviewCollaboration.mutate(
      { requestId, approve },
      {
        onSuccess: () => {
          void refetch();
          if (approve) onAccepted();
        },
      },
    );
  };

  if (pendingRequests.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Pending requests</Label>
      <div className="divide-y border rounded-none">
        {pendingRequests.map((req) => (
          <div key={req.id} className="flex items-center justify-between gap-2 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={req.requester?.avatar_url || undefined} />
                <AvatarFallback>{req.requester?.username?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {req.requester?.username || "Someone"}
                </p>
                {req.message && (
                  <p className="truncate text-xs text-text-secondary">{req.message}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={reviewCollaboration.isPending}
                onClick={() => handleReview(req.id, true)}
              >
                <Check className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Accept</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-text-secondary hover:text-feedback-destructive"
                disabled={reviewCollaboration.isPending}
                onClick={() => handleReview(req.id, false)}
              >
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Reject</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
