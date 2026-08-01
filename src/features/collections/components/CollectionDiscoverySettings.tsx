/**
 * CollectionDiscoverySettings.tsx
 *
 * The Map View tab's discovery control: draw every building in view so the
 * collection can be built straight from the map.
 *
 * It switches the *source* on. Whether the collection's own pins step aside to
 * leave only what could still be added is no longer a second switch buried
 * here — it is the rail's Collection / Discover / All toggle, which says it in
 * one place and applies to the list at the same time (ADR 0026).
 *
 * Like the Saved Places controls beside it, this is a per-viewer preference
 * that applies the moment it is switched — deliberately NOT part of the
 * dialog's `formData`, and it must not wait for "Save Changes".
 */
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CollectionDiscoverySettingsProps {
  showAllBuildings: boolean;
  onShowAllBuildingsChange: (value: boolean) => void;
}

export function CollectionDiscoverySettings({
  showAllBuildings,
  onShowAllBuildingsChange,
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
        <Alert className="py-3">
          <Info className="size-4 shrink-0" aria-hidden />
          <AlertDescription className="text-xs">
            These buildings are not part of this collection. Tap one to see it and add it. Use the
            Collection / Discover / All toggle above the list to choose which of them you see.
            Only you see this view.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
