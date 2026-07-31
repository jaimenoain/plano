/**
 * CollectionMembershipAction.tsx
 *
 * The one collection action inside the building drawer on a collection page.
 * Which one it is follows membership, not how the drawer was opened: a building
 * already in the collection offers "Remove from collection", one that is not
 * offers "Add to this collection". Owners and editors get a handler for each;
 * everyone else gets neither, and the action disappears entirely.
 *
 * The drawer does not close on add, so the button flips in place — the
 * confirmation, and the undo, live where the click happened.
 */
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClusterResponse } from "../hooks/useMapData";

interface CollectionMembershipActionProps {
  /** The building the drawer is showing, or null when it is closed. */
  cluster: ClusterResponse | null;
  /** Is this building already an item of the open collection? */
  inCollection: boolean;
  /** Editors only: add this building to the open collection. */
  onAdd?: (cluster: ClusterResponse) => void;
  /** Editors only: remove it. The caller owns the confirm dialog + refetch. */
  onRemove?: (buildingId: string) => void;
}

export function CollectionMembershipAction({
  cluster,
  inCollection,
  onAdd,
  onRemove,
}: CollectionMembershipActionProps) {
  if (!cluster) return null;

  if (inCollection) {
    if (!onRemove) return null;
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-full justify-center gap-1.5 border-feedback-destructive/40 text-xs text-feedback-destructive hover:bg-feedback-destructive hover:text-feedback-destructive-foreground"
        onClick={() => onRemove(String(cluster.id))}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remove from collection
      </Button>
    );
  }

  if (!onAdd) return null;
  return (
    <Button className="w-full" onClick={() => onAdd(cluster)}>
      <Plus className="mr-2 h-4 w-4" />
      Add to this collection
    </Button>
  );
}
