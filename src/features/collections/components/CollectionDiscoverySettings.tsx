/**
 * CollectionDiscoverySettings.tsx
 *
 * The Map View tab's discovery controls: draw every building in view so the
 * collection can be built straight from the map, and optionally step the
 * collection's own pins aside to leave only what could still be added.
 *
 * Like the Saved Places controls beside it, these are per-viewer preferences
 * that apply the moment they are switched — they are deliberately NOT part of
 * the dialog's `formData` and must not wait for "Save Changes".
 */
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CollectionDiscoverySettingsProps {
  showAllBuildings: boolean;
  onShowAllBuildingsChange: (value: boolean) => void;
  hideCollectionPins: boolean;
  onHideCollectionPinsChange: (value: boolean) => void;
}

export function CollectionDiscoverySettings({
  showAllBuildings,
  onShowAllBuildingsChange,
  hideCollectionPins,
  onHideCollectionPinsChange,
}: CollectionDiscoverySettingsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="show-all-buildings" className="flex flex-col space-y-1">
          <span>Show All Buildings</span>
          <span className="font-normal text-xs text-text-secondary">
            Explore every building on the map so you can add them to this collection
          </span>
        </Label>
        <Switch
          id="show-all-buildings"
          checked={showAllBuildings}
          onCheckedChange={onShowAllBuildingsChange}
        />
      </div>

      {showAllBuildings && (
        <>
          <Alert className="py-3">
            <Info className="size-4 shrink-0" aria-hidden />
            <AlertDescription className="text-xs">
              These buildings are not part of this collection. Tap one to see it and add it.
              Only you see this view.
            </AlertDescription>
          </Alert>
          <div className="rounded-none border border-border-default bg-surface-muted/40 p-3">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="hide-collection-pins" className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-text-primary">
                  Hide buildings already in this collection
                </span>
                <span className="font-normal text-xs text-text-secondary">
                  Show only what you could still add. The list keeps the full collection.
                </span>
              </Label>
              <Switch
                id="hide-collection-pins"
                checked={hideCollectionPins}
                onCheckedChange={onHideCollectionPinsChange}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
