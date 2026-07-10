import { Link } from 'react-router';
import { getLocalityUrl } from '@/utils/url';
import type { GuidesLocalityRow } from './guidesApi';

interface LocalityCardProps {
  locality: GuidesLocalityRow;
  featured?: boolean;
}

export function LocalityCard({ locality, featured = false }: LocalityCardProps) {
  const href = getLocalityUrl(locality.countryCode, locality.citySlug);

  if (featured) {
    return (
      <Link to={href} className="group block">
        <div className="aspect-4/3 w-full overflow-hidden">
          {locality.heroImageUrl ? (
            <img
              src={locality.heroImageUrl}
              alt={locality.city}
              className="h-full w-full object-cover grayscale transition duration-200 group-hover:grayscale-0"
              loading="lazy"
            />
          ) : (
            <div className="photo-placeholder size-full" data-label={locality.city} />
          )}
        </div>
        <p className="mt-3 text-xl font-bold leading-tight tracking-tight text-text-primary">
          {locality.city}
        </p>
        <p className="mt-0.5 text-2xs font-medium uppercase tracking-widest text-text-secondary">
          {locality.buildingsCount} buildings
        </p>
      </Link>
    );
  }

  return (
    <Link
      to={href}
      className="group flex items-center justify-between py-2.5 border-b border-border-default last:border-0 transition-colors duration-150"
    >
      <span className="text-sm font-medium text-text-primary group-hover:underline underline-offset-2 transition-all">
        {locality.city}
      </span>
      <span className="meta-code tabular-nums text-text-disabled">
        {locality.buildingsCount}
      </span>
    </Link>
  );
}
