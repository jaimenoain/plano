import { Loader2, X } from "lucide-react";

// ─── Pending photos queue ─────────────────────────────────────────────────────

interface PendingPhotoPreview {
  id: string;
  preview: string;
}

export function PendingPhotosQueue({
  pendingImages,
  isSavingNote,
  onRemove,
  onSave,
}: {
  pendingImages: PendingPhotoPreview[];
  isSavingNote: boolean;
  onRemove: (id: string) => void;
  onSave: () => void;
}) {
  if (pendingImages.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pendingImages.map((img) => (
        <div key={img.id} className="relative h-16 w-16 shrink-0 bg-surface-muted">
          <img src={img.preview} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <button
            type="button"
            className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-surface-overlay text-text-primary hover:bg-surface-muted"
            onClick={() => onRemove(img.id)}
            aria-label="Remove pending photo"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={isSavingNote}
        className="text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary disabled:opacity-50"
        onClick={onSave}
      >
        {isSavingNote ? (
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden />
        ) : null}
        Save photos →
      </button>
    </div>
  );
}
