import { useNavigate } from "react-router";
import { FeedCollection } from "@/types/feed";

interface FeedCollectionCardProps {
  collection: FeedCollection;
}

export function FeedCollectionCard({ collection }: FeedCollectionCardProps) {
  const navigate = useNavigate();
  const ownerUsername = collection.owner?.username ?? "user";

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    navigate(`/${ownerUsername}/map/${collection.slug}`);
  };

  return (
    <article
      onClick={handleClick}
      className="group/collection relative w-full cursor-pointer flex gap-0"
    >
      {/* Lime accent bar */}
      <div className="w-[3px] shrink-0 bg-brand-accent self-stretch" aria-hidden />

      {/* Content */}
      <div className="flex-1 min-w-0 bg-surface-muted px-6 py-7">
        {/* Label row */}
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-disabled mb-4">
          Collection
          {ownerUsername && (
            <span className="text-text-disabled"> · @{ownerUsername}</span>
          )}
          {collection.buildingCount != null && collection.buildingCount > 0 && (
            <span className="text-text-disabled"> · {collection.buildingCount} buildings</span>
          )}
        </p>

        {/* Collection name */}
        <h3 className="font-sans font-bold tracking-[-0.03em] text-text-primary leading-[0.95] text-[clamp(1.75rem,3.5vw,2.5rem)] line-clamp-3 mb-4">
          {collection.name}
        </h3>

        {/* Description */}
        {collection.description && (
          <p className="font-sans text-[15px] leading-[1.6] text-text-secondary line-clamp-2 mb-6">
            {collection.description}
          </p>
        )}

        {/* CTA */}
        <span className="group/cta inline-flex items-center gap-1.5 font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-text-primary transition-colors group-hover/collection:text-text-secondary">
          View collection
          <span className="transition-transform group-hover/collection:translate-x-0.5 text-brand-accent">→</span>
        </span>
      </div>
    </article>
  );
}
