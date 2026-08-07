/**
 * The map's "No buildings in this area" notice — presentational only. All of the
 * show/hide, settle-delay and dismissal logic lives in `useEmptyAreaNotice`.
 */
import { X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface MapEmptyAreaNoticeProps {
  /** Zoom the map out a step. The notice deliberately stays mounted through the refetch. */
  onZoomOut: () => void;
  /** Suppress the notice for 24 hours. */
  onDismiss: () => void;
}

export function MapEmptyAreaNotice({ onZoomOut, onDismiss }: MapEmptyAreaNoticeProps) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-xs bg-surface-card/95 backdrop-blur-xs border border-border-default animate-in fade-in zoom-in duration-300">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1 text-text-secondary hover:opacity-60 transition-opacity"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <EmptyState
        className="px-6 py-8"
        eyebrow="No buildings in this area"
        action={
          <button
            type="button"
            onClick={onZoomOut}
            className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
          >
            Zoom out →
          </button>
        }
      />
    </div>
  );
}
