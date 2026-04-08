import { useNavigate } from "react-router";
import { useState } from "react";
import { FeedCollection } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

interface FeedCollectionCardProps {
  collection: FeedCollection;
}

function resolvePreviewSrc(pb: FeedCollection["previewBuildings"][number] | undefined) {
  if (!pb) return undefined;
  return (
    getBuildingImageUrl(pb.mainImageUrl) ??
    getBuildingImageUrl(pb.communityPreviewUrl)
  );
}

function MosaicCell({ imageSrc }: { imageSrc: string | undefined }) {
  const [errored, setErrored] = useState(false);

  if (!imageSrc || errored) {
    return <div className="flex-1 min-w-0 h-full bg-surface-muted" />;
  }

  return (
    <div className="flex-1 min-w-0 h-full overflow-hidden bg-surface-muted">
      <img
        src={imageSrc}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

export function FeedCollectionCard({ collection }: FeedCollectionCardProps) {
  const navigate = useNavigate();

  const username = collection.owner?.username ?? "unknown";

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    navigate(`/${username}/list/${collection.slug}`);
  };

  const slots = Array.from({ length: 6 }).map((_, i) =>
    resolvePreviewSrc(collection.previewBuildings?.[i])
  );

  return (
    <article
      onClick={handleCardClick}
      className="w-full cursor-pointer"
    >
      {/* Horizontal photo strip */}
      <div className="flex gap-mosaic-gap w-full h-[240px] overflow-hidden">
        {slots.map((url, i) => (
          <MosaicCell key={i} imageSrc={url} />
        ))}
      </div>

      {/* Metadata */}
      <div className="mt-4">
        {/* Category label */}
        <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary">
          Collection
        </span>

        {/* Collection name */}
        <h3 className="text-2xl font-semibold tracking-tight text-text-primary mt-1">
          {collection.name}
        </h3>

        {/* Details row */}
        <p className="text-sm text-text-secondary mt-1">
          {username} · {collection.buildingCount ?? 0} buildings
        </p>

        {/* Description */}
        {collection.description && (
          <p className="text-sm text-text-secondary mt-2 line-clamp-2">
            {collection.description}
          </p>
        )}
      </div>
    </article>
  );
}
