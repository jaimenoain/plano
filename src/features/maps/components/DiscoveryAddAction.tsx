/**
 * DiscoveryAddAction.tsx
 *
 * The collection map's discovery-layer call to action: the building panel that
 * opens from a discovered pin ends in a single "Add to this collection" button.
 * Once the building is in, the button stays put but goes inert — the panel does
 * not close on add, so the confirmation has to live where the click happened.
 */
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClusterResponse } from "../hooks/useMapData";

interface DiscoveryAddActionProps {
  cluster: ClusterResponse;
  isInCollection: boolean;
  onAdd: (cluster: ClusterResponse) => void;
}

export function DiscoveryAddAction({ cluster, isInCollection, onAdd }: DiscoveryAddActionProps) {
  if (isInCollection) {
    return (
      <Button variant="outline" className="w-full" disabled>
        <Check className="mr-2 h-4 w-4" />
        In this collection
      </Button>
    );
  }

  return (
    <Button className="w-full" onClick={() => onAdd(cluster)}>
      <Plus className="mr-2 h-4 w-4" />
      Add to this collection
    </Button>
  );
}
