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
 * Standard buildings render the redesigned BuildingDrawerBody (photo gallery,
 * architect/year, labelled visit/save/hide + rating, inline note & collection
 * quick-actions, your notes, a composed summary, and a sticky "Open full
 * profile" footer). Custom markers and candidates keep the compact, battle-
 * tested BuildingPopupContent card (LegacyDetailBody below).
 */
import { Link } from "react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowRight } from "lucide-react";
import { ClusterResponse } from "../hooks/useMapData";
import { BuildingPopupContent } from "./BuildingPopupContent";
import { BuildingDrawerBody } from "./BuildingDrawerBody";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { getBuildingUrl } from "@/utils/url";
import { useIsMobile } from "@/hooks/use-mobile";

interface BuildingDetailDrawerProps {
  /** The selected building, or null when nothing is selected (drawer closed). */
  cluster: ClusterResponse | null;
  onClose: () => void;
  /** Legacy card path only: remove a custom marker / candidate from the collection. */
  onRemoveFromCollection?: (buildingId: string) => void;
  /** Collection context: promote a saved candidate into the collection. */
  onAddCandidate?: (id: string) => void;
  /** Desktop only: close the panel when the user clicks outside of it. */
  closeOnOutsideClick?: boolean;
  /**
   * The collection map's single add/remove action, rendered inside the standard
   * body. Ignored by the legacy card path, which carries its own actions.
   */
  collectionAction?: ReactNode;
}

/** Legacy card path — custom markers & candidates keep the compact popup card. */
function LegacyDetailBody({
  cluster,
  onClose,
  onRemoveFromCollection,
  onAddCandidate,
}: {
  cluster: ClusterResponse;
  onClose: () => void;
  onRemoveFromCollection?: (buildingId: string) => void;
  onAddCandidate?: (id: string) => void;
}) {
  const fullUrl = getBuildingUrl(String(cluster.id), cluster.slug);
  return (
    <>
      <BuildingPopupContent
        cluster={cluster}
        fullWidth
        hideCardLink
        onRemoveFromCollection={onRemoveFromCollection}
        onAddCandidate={onAddCandidate}
      />
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

export function BuildingDetailDrawer({
  cluster,
  onClose,
  onRemoveFromCollection,
  onAddCandidate,
  closeOnOutsideClick,
  collectionAction,
}: BuildingDetailDrawerProps) {
  const isMobile = useIsMobile();
  const isSpecial = !!(cluster?.is_custom_marker || cluster?.is_candidate);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile || !closeOnOutsideClick || !cluster) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isMobile, closeOnOutsideClick, cluster, onClose]);

  if (isMobile) {
    return (
      <Drawer open={!!cluster} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="border-none">
          <DrawerTitle className="sr-only">
            {cluster?.name || "Building details"}
          </DrawerTitle>
          {cluster &&
            (isSpecial ? (
              <div className="overflow-y-auto max-h-[75vh] pb-8">
                <LegacyDetailBody
                  cluster={cluster}
                  onClose={onClose}
                  onRemoveFromCollection={onRemoveFromCollection}
                  onAddCandidate={onAddCandidate}
                />
              </div>
            ) : (
              <BuildingDrawerBody
                cluster={cluster}
                onClose={onClose}
                layout="sheet"
                collectionAction={collectionAction}
              />
            ))}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: non-modal right panel anchored inside the map container.
  if (!cluster) return null;

  if (isSpecial) {
    return (
      <div
        ref={panelRef}
        className="absolute right-0 top-0 z-70 flex h-full w-full max-w-sm flex-col border-l border-border-default bg-surface-card animate-in slide-in-from-right-8 duration-200"
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
          <LegacyDetailBody
            cluster={cluster}
            onClose={onClose}
            onRemoveFromCollection={onRemoveFromCollection}
            onAddCandidate={onAddCandidate}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-0 z-70 flex h-full w-full max-w-md flex-col border-l border-border-default bg-surface-card animate-in slide-in-from-right-8 duration-200"
      role="dialog"
      aria-label={cluster.name || "Building details"}
    >
      <BuildingDrawerBody
        cluster={cluster}
        onClose={onClose}
        layout="panel"
        collectionAction={collectionAction}
      />
    </div>
  );
}
