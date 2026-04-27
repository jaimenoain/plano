import { useState } from "react";
import { useNavigate } from "react-router";
import { FeedCollection } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

interface FeedCollectionCardProps {
  collection: FeedCollection;
}

export function FeedCollectionCard({ collection }: FeedCollectionCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const ownerUsername = collection.owner?.username ?? "user";
  const firstBuilding = collection.previewBuildings?.[0];
  const imageSrc = imgError
    ? undefined
    : (getBuildingImageUrl(firstBuilding?.mainImageUrl) ??
       getBuildingImageUrl(firstBuilding?.communityPreviewUrl));

  const handleClick = () => navigate(`/${ownerUsername}/map/${collection.slug}`);

  return (
    <article
      onClick={handleClick}
      className="group/collection relative aspect-[3/4] cursor-pointer overflow-hidden bg-[#1a1a1a]"
    >
      {/* Background image — grayscaled and slightly darkened */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover grayscale opacity-60 transition-transform duration-700 group-hover/collection:scale-105"
        />
      )}

      {/* Gradient: transparent top → near-black bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Text — anchored to bottom */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3 md:p-4">
        <p className="font-mono text-[8px] md:text-[9px] uppercase tracking-[0.15em] text-white/45 leading-none">
          @{ownerUsername}
          {collection.buildingCount != null && collection.buildingCount > 0 && (
            <> · {collection.buildingCount}</>
          )}
        </p>
        <h3 className="font-sans font-bold text-white tracking-[-0.02em] leading-[1.05] line-clamp-3 text-[0.7rem] md:text-[0.875rem]">
          {collection.name}
        </h3>
      </div>
    </article>
  );
}
