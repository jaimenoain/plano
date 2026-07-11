interface MasonryPhoto {
  id: string;
  url: string;
  building_name?: string | null;
}

/**
 * CSS-columns masonry photo grid. Photos at index 0, 7, 14… get a taller
 * aspect ratio for editorial rhythm. Used on the profile photos tab and
 * shareable elsewhere a photo mosaic is needed.
 */
export function MasonryPhotoGrid({ photos }: { photos: MasonryPhoto[] }) {
  return (
    <div className="columns-2 md:columns-3 gap-px">
      {photos.map((photo, i) => {
        const isFeatured = i === 0 || i % 7 === 0;
        return (
          <div
            key={photo.id}
            className={`relative overflow-hidden bg-surface-muted group cursor-pointer break-inside-avoid mb-px ${isFeatured ? "aspect-3/4" : "aspect-square"}`}
          >
            <img
              src={photo.url}
              alt={photo.building_name || ""}
              className="w-full h-full object-cover group-hover:opacity-85 transition-opacity duration-200"
            />
            {photo.building_name && (
              /* bg-black/* scrim + text-white caption: the sanctioned photo-overlay
                 treatment per COMPONENT_SPEC §8 (backdrop convention). */
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 [@media(hover:none)]:bg-black/50 transition-colors flex items-end">
                <span className="translate-y-1.5 group-hover:translate-y-0 [@media(hover:none)]:translate-y-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-all duration-200 text-2xs-plus text-white font-medium px-2.5 pb-2.5 line-clamp-1 leading-tight">
                  {photo.building_name}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
