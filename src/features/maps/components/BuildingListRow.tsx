/**
 * BuildingListRow.tsx
 *
 * The shared editorial SERP row used by both the /search sidebar
 * (BuildingSidebar) and the collection detail list (CollectionBuildingCard).
 * Presentational only — the caller owns data mapping, hover/selection state,
 * and any extra affordances (notes, category, remove) via the slot props.
 *
 * Layout: name / alt-name / credits / city / (construction + library status +
 * rating dots) in a flex-1 text column, with a 96px inset thumbnail on the
 * right. Plain click calls `onSelect` (open the detail drawer); modified clicks
 * (⌘/ctrl/shift/alt) fall through to the `href` <Link> for "open in new tab".
 *
 * Slots:
 *   leadingSlot — before the text column (e.g. itinerary drag handle).
 *   footerSlot  — inside the text column, below the status line (e.g. note
 *                 editor + category select).
 *   actionSlot  — absolutely positioned top-right (e.g. remove-on-hover button).
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { RatingDots } from '@/components/ui/rating-dots';
import { getBuildingImageUrl } from '@/utils/image';
import {
  shouldFlagConstructionStatus,
  formatBuildingStatusForDisplay,
} from '@/lib/buildingStatus';

interface BuildingListRowProps {
  /** Full building URL — used for modified-click "open in new tab". */
  href: string;
  name: string;
  altName?: string | null;
  creditNames?: string[] | null;
  city?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  status?: string | null;
  /** Raw construction status (Lost/Unbuilt/Under Construction/Temporary). */
  constructionStatus?: string | null;
  /** Subtle cross-highlight (list ↔ map). Off by default so /search is unchanged. */
  isHighlighted?: boolean;
  /** Plain-click handler — opens the detail drawer. */
  onSelect: () => void;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
  /** Before the text column (e.g. itinerary drag handle). */
  leadingSlot?: ReactNode;
  /** Inside the text column, below the status line (e.g. note + category). */
  footerSlot?: ReactNode;
  /** Absolutely positioned top-right (e.g. remove-on-hover button). */
  actionSlot?: ReactNode;
}

export function BuildingListRow({
  href,
  name,
  altName,
  creditNames,
  city,
  imageUrl: rawImageUrl,
  rating,
  status,
  constructionStatus,
  isHighlighted = false,
  onSelect,
  onHoverEnter,
  onHoverLeave,
  leadingSlot,
  footerSlot,
  actionSlot,
}: BuildingListRowProps) {
  const imageUrl = getBuildingImageUrl(rawImageUrl);
  const credits = (creditNames ?? []).filter(Boolean);
  const ratingValue = rating ?? 0;
  const showStatusLine =
    shouldFlagConstructionStatus(constructionStatus) ||
    (!!status && status !== 'none') ||
    ratingValue > 0;

  return (
    <Link
      to={href}
      className={cn(
        'group relative flex pl-4 pr-3 py-3 border-b border-border-default last:border-0 transition-colors',
        isHighlighted ? 'bg-surface-muted' : 'hover:bg-surface-muted',
      )}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onClick={(e) => {
        // Plain click opens the detail drawer instead of navigating to the full
        // building page. Modified clicks (⌘/ctrl/shift/alt) fall through so
        // "open in new tab" still works.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onSelect();
      }}
    >
      {actionSlot}

      {leadingSlot}

      {/* Text content */}
      <div className="flex-1 min-w-0 pr-3 flex flex-col justify-center min-h-[72px]">
        {/* Kit `.serp-name` — 19px/700/−0.02em. 14px/600 hedged the scale,
            the single commonest reason a Plano screen reads flat. */}
        <h3
          className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-text-primary group-hover:opacity-70 transition-opacity"
          title={name}
        >
          {name}
        </h3>
        {altName && altName !== name && (
          <span className="max-w-search-serp-alt truncate text-xs italic text-text-secondary mt-0.5">
            {altName}
          </span>
        )}

        {/* Architect (credits) and locality (city only) */}
        <div className="mt-1 flex flex-col gap-0.5">
          {credits.length > 0 && (
            <p className="text-xs text-text-secondary line-clamp-1">
              {credits.join(', ')}
            </p>
          )}
          {city ? (
            <p className="text-xs text-text-disabled line-clamp-1">{city}</p>
          ) : null}
        </div>

        {/* Construction status + library status + rating */}
        {showStatusLine && (
          <div className="mt-1.5 flex items-center gap-3">
            {shouldFlagConstructionStatus(constructionStatus) && (
              <span className="border border-border-default px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-text-secondary">
                {formatBuildingStatusForDisplay(constructionStatus!)}
              </span>
            )}
            {status && status !== 'none' && (
              <span className="text-2xs font-medium uppercase tracking-widest text-text-disabled capitalize">
                {status}
              </span>
            )}
            {/* `aria-label="Rating: 2"` announced a score out of nothing.
                RatingDots names the earned distinctions instead. */}
            <RatingDots rating={ratingValue} size="sm" />
          </div>
        )}

        {footerSlot}
      </div>

      {/* Image — inset from column edge via row pr-3 */}
      <div className="relative w-24 shrink-0 bg-surface-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          // Never a flat grey box — the system's hatched placeholder, labelled.
          <div className="photo-placeholder h-full w-full" data-label="No photo" />
        )}
      </div>
    </Link>
  );
}
