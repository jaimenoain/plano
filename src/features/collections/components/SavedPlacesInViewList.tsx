/**
 * SavedPlacesInViewList.tsx
 *
 * The Discover view's first section: the viewer's *own* saved places sitting in
 * the current map view that this collection doesn't hold yet.
 *
 * It goes above the catalogue section because it is the shorter, higher-intent
 * list — buildings this person already marked as visited or worth visiting are
 * the ones most likely to belong here. The map has drawn these as candidate
 * pins since long before the rail did; this is the same set, in the same
 * viewport, finally readable as a list.
 *
 * Rows are `BuildingListRow` with `AddToCollectionButton` in `actionSlot`, the
 * same pairing `CollectionDiscoverPanel` uses, so the two sections of one view
 * are one list to the eye.
 *
 * Presentational apart from which button is spinning: the page owns the data
 * (it is already computing this set for the map) and both mutations.
 */
import { useState } from "react";
import { Loader2, MapPinPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingListRow } from "@/features/maps";
import type { DiscoveryBuilding } from "@/features/search";
import { resolveBuildingUrl } from "@/utils/url";
import { AddToCollectionButton } from "./AddToCollectionButton";

interface SavedPlacesInViewListProps {
  /** Saved places in the viewport, already minus the collection and filtered. */
  buildings: DiscoveryBuilding[];
  /** The map hasn't settled yet, so "in view" means nothing so far. */
  hasBounds: boolean;
  canEdit: boolean;
  onAdd: (building: { id: string; name?: string | null }) => Promise<void>;
  /** Adds every row at once, behind the page's confirm step. */
  onAddAll: () => void;
  isAddingAll: boolean;
}

export function SavedPlacesInViewList({
  buildings,
  hasBounds,
  canEdit,
  onAdd,
  onAddAll,
  isAddingAll,
}: SavedPlacesInViewListProps) {
  const [addingId, setAddingId] = useState<string | null>(null);

  if (!hasBounds) {
    return (
      <EmptyState
        eyebrow="Waiting for the map"
        message="Move or zoom the map and your saved places in view appear here."
      />
    );
  }

  if (buildings.length === 0) {
    return (
      <EmptyState
        eyebrow="None of your saved places here"
        message="Nothing you've saved sits in this view that isn't already in the collection. Move the map to look elsewhere."
      />
    );
  }

  async function handleAdd(building: DiscoveryBuilding) {
    setAddingId(building.id);
    try {
      await onAdd({ id: building.id, name: building.name });
    } finally {
      setAddingId(null);
    }
  }

  return (
    <>
      {canEdit && buildings.length > 1 && (
        <div className="border-b border-border-default px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full border border-border-default shadow-none"
            disabled={isAddingAll}
            onClick={onAddAll}
          >
            {isAddingAll ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <MapPinPlus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            )}
            {isAddingAll ? "Adding…" : `Add all ${buildings.length} to collection`}
          </Button>
        </div>
      )}
      {buildings.map((building) => (
        <BuildingListRow
          key={building.id}
          href={resolveBuildingUrl(building)}
          name={building.name}
          altName={building.alt_name}
          creditNames={(building.credits ?? []).map((credit) => credit.name)}
          city={building.city}
          imageUrl={building.main_image_url}
          rating={building.personal_rating}
          status={building.personal_status}
          // These rows do have a pin, but it is the map's candidate layer rather
          // than a collection item, so there is no drawer for the rail to open.
          onSelect={() => {}}
          actionSlot={
            canEdit ? (
              <div className="absolute right-3 top-3 z-10">
                <AddToCollectionButton
                  buildingName={building.name}
                  isAdding={addingId === building.id}
                  disabled={addingId !== null || isAddingAll}
                  onAdd={() => void handleAdd(building)}
                />
              </div>
            ) : undefined
          }
        />
      ))}
    </>
  );
}
