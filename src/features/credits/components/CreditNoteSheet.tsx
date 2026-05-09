import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resizeImage } from "@/lib/image-compression";
import {
  upsertCreditNote,
  deleteCreditNote,
  buildingCreditsQueryKey,
} from "@/features/credits/api/credits";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import type { CreditNote, CreditRole } from "@/features/credits/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { getStorageAssetUrl } from "@/utils/image";

const MAX_IMAGES = 5;
const IMAGE_BUCKET = "avatars";

interface CreditNoteSheetProps {
  creditId: string;
  buildingId: string;
  buildingName: string | null | undefined;
  creditRole: CreditRole;
  creditRoleCustom: string | null;
  /** Existing note; null means creating for the first time. */
  existingNote: CreditNote | null;
  onClose: () => void;
}

function uploadCreditNoteImage(
  creditId: string,
  userId: string,
  file: File,
): Promise<string> {
  return resizeImage(file, 1600, 1200, 0.85).then(async (resized) => {
    const ext = resized.name.split(".").pop() ?? "jpg";
    const path = `credit-notes/${creditId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, resized);
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    void userId;
    return data.publicUrl;
  });
}

export function CreditNoteSheet({
  creditId,
  buildingId,
  buildingName,
  creditRole,
  creditRoleCustom,
  existingNote,
  onClose,
}: CreditNoteSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleLabel = formatCreditRoleLabel(creditRole, creditRoleCustom);
  const isEditing = existingNote != null;

  const [content, setContent] = useState(existingNote?.content ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(existingNote?.imageUrls ?? []);
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertCreditNote(creditId, { content: content.trim(), imageUrls }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: buildingCreditsQueryKey(buildingId) });
      toast({ title: isEditing ? "Note updated" : "Note added" });
      onClose();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Could not save note" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCreditNote(creditId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: buildingCreditsQueryKey(buildingId) });
      toast({ title: "Note removed" });
      onClose();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Could not remove note" });
    },
  });

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - imageUrls.length;
    if (remaining <= 0) {
      toast({ description: `Maximum ${MAX_IMAGES} images per note.` });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    const toUpload = Array.from(files).slice(0, remaining);
    try {
      const uploaded = await Promise.all(
        toUpload.map((f) => uploadCreditNoteImage(creditId, user.id, f)),
      );
      setImageUrls((prev) => [...prev, ...uploaded]);
    } catch {
      toast({ variant: "destructive", title: "Image upload failed" });
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  const isBusy = saveMutation.isPending || deleteMutation.isPending || uploading;
  const canSave = content.trim().length > 0 && !isBusy;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isEditing ? "Edit your note" : "Add a note about your work"}</SheetTitle>
        <SheetDescription>
          Your note will appear alongside your{" "}
          <span className="font-medium text-text-primary">{roleLabel}</span> credit
          {buildingName?.trim() ? (
            <>
              {" "}on{" "}
              <span className="font-medium text-text-primary">{buildingName.trim()}</span>
            </>
          ) : null}
          .
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto">
        {/* Role attribution badge */}
        <div className="rounded-none border border-border-default bg-surface-muted px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-secondary">
            Your involvement
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary">{roleLabel}</p>
          {buildingName?.trim() ? (
            <p className="text-sm text-text-secondary">{buildingName.trim()}</p>
          ) : null}
        </div>

        {/* Note textarea */}
        <div className="space-y-2">
          <label
            htmlFor="credit-note-content"
            className="text-sm font-medium text-text-primary"
          >
            Note
          </label>
          <Textarea
            id="credit-note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe your involvement, the challenges you tackled, the design decisions you made…"
            maxLength={5000}
            rows={8}
            disabled={isBusy}
            className="resize-y"
          />
          <p className="text-right text-xs text-text-disabled">
            {content.length}/5000
          </p>
        </div>

        {/* Image upload */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-primary">
            Photos{" "}
            <span className="font-normal text-text-secondary">(optional, up to {MAX_IMAGES})</span>
          </p>

          {imageUrls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {imageUrls.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-none border border-border-default">
                  <img
                    src={getStorageAssetUrl(url) ?? url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    disabled={isBusy}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {imageUrls.length < MAX_IMAGES ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => void handleImageFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <ImagePlus className="h-4 w-4" aria-hidden />
                {uploading ? "Uploading…" : "Add photos"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-default pt-6">
        {isEditing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy}
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {deleteMutation.isPending ? "Removing…" : "Remove note"}
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSave}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Add note"}
          </Button>
        </div>
      </div>
    </>
  );
}
