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
      <Link
        to={href}
        className="group relative block overflow-hidden rounded-none bg-surface-muted border border-border-default hover:border-border-strong transition-colors duration-150"
        style={{ aspectRatio: '4/3' }}
      >
        {locality.heroImageUrl ? (
          <img
            src={locality.heroImageUrl}
            alt={locality.city}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-muted" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-xl font-bold text-white leading-tight tracking-tight">
            {locality.city}
          </p>
          <p className="text-white/70 text-xs font-medium uppercase tracking-widest mt-0.5">
            {locality.buildingsCount} buildings
          </p>
        </div>
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
      <span className="text-xs text-text-secondary tabular-nums">
        {locality.buildingsCount}
      </span>
    </Link>
  );
}
