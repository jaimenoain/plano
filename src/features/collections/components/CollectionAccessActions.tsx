/**
 * CollectionAccessActions.tsx
 *
 * The right-hand action cluster in the collection detail header. Renders one of
 * three honest permission states so a control is never shown that the database
 * would reject:
 *   • owner / editor  → Add buildings + Settings (full edit)
 *   • logged-in guest → Favorite + Request to collaborate + View options
 *   • logged-out      → View options + Log in to collaborate
 */
import { Link, useLocation } from "react-router";
import { Plus, Settings, Star, SlidersHorizontal, UserPlus, LogIn, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMyCollaborationRequest,
  useRequestCollaboration,
} from "../hooks/useCollectionCollaboration";
import { collaborationCtaState } from "../collaborationCopy";

interface CollectionAccessActionsProps {
  canEdit: boolean;
  isLoggedIn: boolean;
  collectionId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAdd: () => void;
  /** Opens the settings sheet — full settings for editors, display-only for others. */
  onOpenSettings: () => void;
}

export function CollectionAccessActions({
  canEdit,
  isLoggedIn,
  collectionId,
  isFavorite,
  onToggleFavorite,
  onAdd,
  onOpenSettings,
}: CollectionAccessActionsProps) {
  const location = useLocation();
  const redirectTarget = encodeURIComponent(`${location.pathname}${location.search}`);

  const { data: requestStatus } = useMyCollaborationRequest(
    collectionId,
    isLoggedIn && !canEdit,
  );
  const requestCollaboration = useRequestCollaboration(collectionId);

  // ── Owner / editor: full edit controls ──
  if (canEdit) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={onAdd} aria-label="Add buildings">
          <Plus className="h-5 w-5 text-text-secondary" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Collection settings">
          <Settings className="h-5 w-5 text-text-secondary" />
        </Button>
      </div>
    );
  }

  // The "view options" sheet is display-only for non-editors (map preferences, saved locally).
  const viewOptionsButton = (
    <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="View options">
      <SlidersHorizontal className="h-5 w-5 text-text-secondary" />
    </Button>
  );

  // ── Logged out: invite to sign in ──
  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        {viewOptionsButton}
        <Button asChild variant="outline" size="sm">
          <Link to={`/login?redirect=${redirectTarget}`}>
            <LogIn className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Log in to collaborate</span>
          </Link>
        </Button>
      </div>
    );
  }

  // ── Logged-in non-collaborator: request to collaborate ──
  const ctaState = collaborationCtaState(requestStatus);

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        className="text-text-secondary hover:text-feedback-warning"
      >
        <Star className={cn("h-5 w-5", isFavorite && "fill-feedback-warning text-feedback-warning")} />
      </Button>
      {viewOptionsButton}
      {ctaState.kind === "pending" ? (
        <Button variant="outline" size="sm" disabled aria-label="Collaboration request pending">
          <Clock className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Request pending</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => requestCollaboration.mutate(undefined)}
          disabled={requestCollaboration.isPending}
        >
          <UserPlus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{ctaState.label}</span>
        </Button>
      )}
    </div>
  );
}
