/**
 * AddToCollectionButton.tsx
 *
 * The "+" on a row that isn't in the collection yet. Shared by the two lists
 * that offer buildings from outside it — the search suggestions under a dead-end
 * query, and the Discover tab's viewport list — so the two can't drift on the
 * label a screen reader hears or on what a click does to the row underneath.
 */
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddToCollectionButtonProps {
  /** Named in the accessible label — the icon alone says nothing about which row. */
  buildingName: string;
  /** This row's add is in flight. */
  isAdding: boolean;
  /** Usually "some other row is mid-add"; blocks a second concurrent insert. */
  disabled?: boolean;
  onAdd: () => void;
}

export function AddToCollectionButton({
  buildingName,
  isAdding,
  disabled = false,
  onAdd,
}: AddToCollectionButtonProps) {
  return (
    <Button
      size="sm"
      className="h-8 w-8 shrink-0 p-0"
      aria-label={`Add ${buildingName} to this collection`}
      disabled={disabled || isAdding}
      onClick={(event) => {
        // The row is a link; adding must not also navigate to the building.
        event.preventDefault();
        event.stopPropagation();
        onAdd();
      }}
    >
      {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
    </Button>
  );
}
