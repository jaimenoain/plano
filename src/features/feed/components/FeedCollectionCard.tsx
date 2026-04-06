import { ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import { useState } from "react";
import { FeedCollection } from "@/types/feed";

interface FeedCollectionCardProps {
  collection: FeedCollection;
}

function MosaicCell({ mainImageUrl }: { mainImageUrl: string | null | undefined }) {
  const [errored, setErrored] = useState(false);

  if (!mainImageUrl || errored) {
    return <div className="flex-1 min-w-0 h-full bg-surface-muted" />;
  }

  return (
    <div className="flex-1 min-w-0 h-full overflow-hidden bg-surface-muted">
      <img
        src={mainImageUrl}
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

  const slots = Array.from({ length: 6 }).map(
    (_, i) => collection.previewBuildings?.[i]?.mainImageUrl ?? null
  );

  const timestamp = collection.updatedAt
    ? formatDistanceToNow(new Date(collection.updatedAt)).replace("about ", "") + " ago"
    : "";

  return (
    <article
      onClick={handleCardClick}
      className="w-full cursor-pointer"
    >
      {/* Horizontal photo strip */}
      <div className="flex gap-mosaic-gap w-full h-[200px] overflow-hidden">
        {slots.map((url, i) => (
          <MosaicCell key={i} mainImageUrl={url} />
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
          {timestamp && <span className="text-text-disabled"> · {timestamp}</span>}
        </p>

        {/* Description */}
        {collection.description && (
          <p className="text-sm text-text-secondary mt-2 line-clamp-2">
            {collection.description}
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleCardClick}
          className="text-xs font-medium tracking-widest uppercase text-text-primary hover:text-brand-primary transition-colors inline-flex items-center gap-1.5 mt-3"
        >
          View collection <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}
