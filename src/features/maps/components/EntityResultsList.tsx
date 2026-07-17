/**
 * EntityResultsList — shared render for the /search People & Companies SERP tabs.
 *
 * People and companies render as near-identical rows (avatar/logo, name, meta),
 * with the same loading / error / empty branches. This collapses that into one
 * component so both tabs (and the Buildings tab's loading/error markup) stay in
 * lockstep. Rows are pre-normalised by the caller — this component only decides
 * which branch to show and lays out the list.
 */
import { Loader2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface EntityResultRow {
  id: string;
  name: string;
  /** Destination path, e.g. `/person/renzo-piano`. */
  href: string;
  /** Resolved image URL, or null/undefined to fall back to the icon. */
  imageUrl: string | null | undefined;
  /** Pre-joined secondary line (e.g. "Italian · 7 credits"); empty string hides it. */
  meta: string;
}

interface EntityResultsListProps {
  loading: boolean;
  error: boolean;
  errorLabel: string;
  empty: ReactNode;
  rows: EntityResultRow[];
  /** Icon shown when a row has no image. */
  fallbackIcon: LucideIcon;
}

export function EntityResultsList({
  loading,
  error,
  errorLabel,
  empty,
  rows,
  fallbackIcon: FallbackIcon,
}: EntityResultsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-feedback-destructive">{errorLabel}</p>
      </div>
    );
  }
  if (rows.length === 0) return <>{empty}</>;

  return (
    <>
      {rows.map((row) => (
        <Link
          to={row.href}
          key={row.id}
          className="group flex items-center gap-3 px-4 py-3 border-b border-border-default last:border-0 hover:bg-surface-muted/40 transition-colors"
        >
          {row.imageUrl ? (
            <img
              src={row.imageUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-none object-cover border border-border-default"
              loading="lazy"
            />
          ) : (
            <FallbackIcon className="h-4 w-4 text-text-disabled shrink-0" strokeWidth={1.5} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight text-text-primary group-hover:opacity-70 transition-opacity truncate">
              {row.name}
            </p>
            {row.meta ? (
              <p className="text-xs text-text-disabled mt-0.5 truncate">{row.meta}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </>
  );
}
