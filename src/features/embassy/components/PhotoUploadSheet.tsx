import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { resizeImageWithDimensions } from "@/lib/image-compression";
import { PendingPhotosQueue } from "@/features/buildings";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  uploadBuildingPhotos,
  type PendingUploadImage,
} from "../api/photoUpload";

/** The minimal building identity the sheet needs — supplied by a list row or a map pin. */
export interface PhotoUploadTarget {
  id: string;
  name: string | null;
}

/**
 * In-place photo upload for the Photography tool. Keyed to one building: pick
 * photos, compress, upload, and record them — without leaving the tool. On
 * success it invalidates the gap queue + map clusters (so the building drops
 * out / its pin count updates) and calls `onUploaded` so the parent can advance
 * to the next building.
 */
export function PhotoUploadSheet({
  building,
  chapterId,
  open,
  onOpenChange,
  onUploaded,
}: {
  building: PhotoUploadTarget | null;
  chapterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (buildingId: string) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImages, setPendingImages] = useState<PendingUploadImage[]>([]);

  const clearPending = useCallback(() => {
    setPendingImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
  }, []);

  // Drop any staged previews whenever the sheet closes so a re-open starts clean.
  useEffect(() => {
    if (!open) clearPending();
  }, [open, clearPending]);

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      for (const file of Array.from(e.target.files)) {
        try {
          const { file: compressed, width, height } =
            await resizeImageWithDimensions(file);
          setPendingImages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              file: compressed,
              preview: URL.createObjectURL(compressed),
              width_px: width,
              height_px: height,
            },
          ]);
        } catch {
          toast.error("Error processing image");
        }
      }
      e.target.value = "";
    },
    [],
  );

  const removePendingImage = useCallback((id: string) => {
    setPendingImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!user || !building) throw new Error("Not ready to upload");
      return uploadBuildingPhotos({
        userId: user.id,
        buildingId: building.id,
        images: pendingImages,
      });
    },
    onSuccess: ({ uploaded }) => {
      const completedId = building!.id;
      toast.success(uploaded === 1 ? "Photo added" : `${uploaded} photos added`);
      clearPending();
      queryClient.invalidateQueries({ queryKey: ["embassy-buildings-no-photo", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters-v3"] });
      onUploaded(completedId);
    },
    onError: (error) => {
      toast.error("Failed to upload photo", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const isUploading = uploadMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 w-full sm:max-w-md">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="truncate pr-6">
            {building?.name || "Add a photo"}
          </SheetTitle>
          <SheetDescription>
            Upload a photo for this building. It counts toward your chapter right away.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-6 py-6 overflow-y-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />

          <Button
            variant="outline"
            className="w-full min-h-11"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera className="mr-2 h-4 w-4" />
            {pendingImages.length > 0 ? "Add more photos" : "Choose photos"}
          </Button>

          <PendingPhotosQueue
            pendingImages={pendingImages}
            isSavingNote={isUploading}
            onRemove={removePendingImage}
            onSave={() => uploadMutation.mutate()}
          />

          {pendingImages.length === 0 && (
            <p className="text-sm text-text-secondary text-center">
              Pick one or more photos to get started.
            </p>
          )}

          {isUploading && (
            <p className="flex items-center justify-center gap-2 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
