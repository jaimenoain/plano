import { cn } from "@/lib/utils";
import { getBuildingImageUrl } from "@/utils/image";

// ─── Note Photo Grid ──────────────────────────────────────────────────────────

export function NotePhotoGrid({
  images,
  totalCount,
  onImageClick,
}: {
  images: { id: string; storage_path: string }[];
  totalCount: number;
  onImageClick: (img: { id: string; storage_path: string }) => void;
}) {
  const count = images.length;
  const extraCount = totalCount - count;

  if (count === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden",
        count === 1 ? "grid-cols-1" : "grid-cols-2",
      )}
    >
      {images.map((img, i) => {
        const url = getBuildingImageUrl(img.storage_path);
        const isLast = i === count - 1 && extraCount > 0;

        // Custom spans for 3 images: first one is wide
        const isThreeAndFirst = count === 3 && i === 0;

        return (
          <button
            key={img.id}
            type="button"
            className={cn(
              "relative bg-surface-muted overflow-hidden group/img transition-all duration-300",
              count === 1 ? "aspect-16/10" : "aspect-square",
              isThreeAndFirst && "col-span-2 aspect-21/9",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(img);
            }}
          >
            {url && (
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                loading="lazy"
              />
            )}
            {isLast ? (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-colors group-hover/img:bg-black/30">
                <span className="text-text-inverse text-xs font-bold tracking-wider">
                  +{extraCount}
                </span>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors" />
            )}
          </button>
        );
      })}
    </div>
  );
}
