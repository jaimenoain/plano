import { Link } from 'react-router';
import { Heart, MapPin } from 'lucide-react';
import type { PopularCollection } from './guidesApi';

interface CollectionGuideCardProps {
  collection: PopularCollection;
}

export function CollectionGuideCard({ collection }: CollectionGuideCardProps) {
  const href = `/${collection.ownerUsername}/map/${collection.slug}`;

  return (
    <Link
      to={href}
      className="group block border-b border-border-default pb-6 last:border-0"
    >
      {/* Mosaic preview */}
      {collection.previewImages.length > 0 && (
        <div
          className="w-full mb-4 overflow-hidden rounded-sm bg-surface-muted"
          style={{ aspectRatio: '16/7' }}
        >
          {collection.previewImages.length === 1 ? (
            <img
              src={collection.previewImages[0]}
              alt={collection.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full grid gap-px"
              style={{
                gridTemplateColumns:
                  collection.previewImages.length >= 3
                    ? '2fr 1fr 1fr'
                    : `repeat(${collection.previewImages.length}, 1fr)`,
              }}
            >
              {collection.previewImages.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.015] ${
                    i === 0 ? 'row-span-1' : ''
                  }`}
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-black text-base text-text-primary leading-snug line-clamp-2 group-hover:text-brand-primary transition-colors">
            {collection.name}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {collection.itemCount} buildings · @{collection.ownerUsername}
          </p>
          {collection.description && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
              {collection.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {collection.hasItinerary && (
            <span className="inline-flex items-center gap-1 text-2xs font-medium uppercase tracking-widest text-text-secondary border border-border-default px-1.5 py-0.5 rounded-sm">
              <MapPin size={9} />
              Itinerary
            </span>
          )}
          {collection.favouritesCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
              <Heart size={11} />
              {collection.favouritesCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
