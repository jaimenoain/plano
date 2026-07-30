/**
 * CollectionAccessActions.tsx
 *
 * The permission-aware controls in the collection detail header. Renders only
 * what the database would actually accept, so a viewer never meets a button
 * that fails:
 *   • owner / editor  → Add buildings + Settings (full edit)
 *   • logged-in guest → Favourite (primary) + Request to collaborate
 *   • logged-out      → Favourite (routed through login) + Log in to collaborate
 *
 * Two exports because the header needs the title *between* them: the
 * fixed-width icon cluster sits beside the collection name (it can only ever
 * steal ~40–80px), while every labelled action lives in a wrapping row
 * underneath, where a long CTA can never squeeze the title.
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

interface UtilityActionsProps {
  canEdit: boolean;
  onAdd: () => void;
  /** Opens the settings sheet — full settings for editors, display-only for others. */
  onOpenSettings: () => void;
}

/**
 * Icon-only controls that sit to the right of the collection name. Kept narrow
 * and label-free on purpose: this is the only cluster the title competes with.
 */
export function CollectionHeaderUtilityActions({
  canEdit,
  onAdd,
  onOpenSettings,
}: UtilityActionsProps) {
  if (canEdit) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onAdd} aria-label="Add buildings">
          <Plus className="text-text-secondary" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onOpenSettings}
          aria-label="Collection settings"
        >
          <Settings className="text-text-secondary" />
        </Button>
      </div>
    );
  }

  // The "view options" sheet is display-only for non-editors (map preferences, saved locally).
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} aria-label="View options">
        <SlidersHorizontal className="text-text-secondary" />
      </Button>
    </div>
  );
}

interface RelationshipActionsProps {
  canEdit: boolean;
  isLoggedIn: boolean;
  collectionId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

/**
 * The labelled actions a visitor can take on someone else's collection.
 * Returns a fragment, not a wrapper — the header owns the wrapping row so it
 * can sit the external-link button alongside these.
 */
export function CollectionRelationshipActions({
  canEdit,
  isLoggedIn,
  collectionId,
  isFavorite,
  onToggleFavorite,
}: RelationshipActionsProps) {
  const location = useLocation();
  const redirectTarget = encodeURIComponent(`${location.pathname}${location.search}`);

  const { data: requestStatus } = useMyCollaborationRequest(collectionId, isLoggedIn && !canEdit);
  const requestCollaboration = useRequestCollaboration(collectionId);

  // Owners and editors have no relationship to form with their own collection.
  if (canEdit) return null;

  // ── Logged out: the primary action is still offered, routed through login ──
  if (!isLoggedIn) {
    return (
      <>
        <Button asChild size="sm">
          <Link to={`/login?redirect=${redirectTarget}`}>
            <Star />
            Add to favourites
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/login?redirect=${redirectTarget}`}>
            <LogIn />
            Log in to collaborate
          </Link>
        </Button>
      </>
    );
  }

  // ── Logged-in non-collaborator: favourite first, collaboration second ──
  const ctaState = collaborationCtaState(requestStatus);

  return (
    <>
      <Button
        size="sm"
        variant={isFavorite ? "outline" : "default"}
        onClick={onToggleFavorite}
        aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
      >
        <Star className={cn(isFavorite && "fill-current")} />
        {isFavorite ? "Favourited" : "Add to favourites"}
      </Button>
      {ctaState.kind === "pending" ? (
        <Button variant="outline" size="sm" disabled aria-label="Collaboration request pending">
          <Clock />
          Request pending
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => requestCollaboration.mutate(undefined)}
          disabled={requestCollaboration.isPending}
        >
          <UserPlus />
          {ctaState.label}
        </Button>
      )}
    </>
  );
}
