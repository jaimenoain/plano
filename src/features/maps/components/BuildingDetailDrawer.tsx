/**
 * BuildingDetailDrawer.tsx
 *
 * The detail surface that opens when a building pin is clicked on the search map.
 *
 *   Desktop: a non-modal panel that slides in from the RIGHT edge of the map.
 *            The map stays fully interactive — clicking another pin swaps the
 *            drawer content; the selected pin stays highlighted behind it.
 *   Mobile:  a bottom sheet (vaul Drawer), matching the rest of the app.
 *
 * Replaces the old behaviour where a pin click opened the full building page in
 * a NEW TAB. Navigation to the full page is now an explicit "View full details"
 * link inside the drawer (same tab).
 *
 * The visual card (image, name, save/visit/hide actions) is the existing,
 * battle-tested BuildingPopupContent, reused with `hideCardLink` so the card
 * itself no longer opens a new tab.
 */
import { Link } from "react-router";
import { X, ArrowRight } from "lucide-react";
import { ClusterResponse } from "../hooks/useMapData";
import { BuildingPopupContent } from "./BuildingPopupContent";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { getBuildingUrl } from "@/utils/url";
import { useIsMobile } from "@/hooks/use-mobile";

interface BuildingDetailDrawerProps {
  /** The selected building, or null when nothing is selected (drawer closed). */
  cluster: ClusterResponse | null;
  onClose: () => void;
}

/** Shared inner content: the building card + a "View full details" link. */
function DetailBody({
  cluster,
  onClose,
}: {
  cluster: ClusterResponse;
  onClose: () => void;
}) {
  const fullUrl = getBuildingUrl(String(cluster.id), cluster.slug);
  return (
    <>
      <BuildingPopupContent cluster={cluster} fullWidth hideCardLink />
      {!cluster.is_custom_marker && (
        <div className="p-4 border-t border-border-default">
          <Link
            to={fullUrl}
            onClick={onClose}
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
          >
            View full details
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </>
  );
}

export function BuildingDetailDrawer({ cluster, onClose }: BuildingDetailDrawerProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={!!cluster} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="border-none">
          <div className="overflow-y-auto max-h-[75vh] pb-8">
            {cluster && <DetailBody cluster={cluster} onClose={onClose} />}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: non-modal right panel anchored inside the map container.
  if (!cluster) return null;
  return (
    <div
      className="absolute right-0 top-0 z-[70] flex h-full w-full max-w-sm flex-col border-l border-border-default bg-surface-card animate-in slide-in-from-right-8 duration-200"
      role="dialog"
      aria-label={cluster.name || "Building details"}
    >
      <div className="flex items-center justify-end border-b border-border-default p-2">
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DetailBody cluster={cluster} onClose={onClose} />
      </div>
    </div>
  );
}
