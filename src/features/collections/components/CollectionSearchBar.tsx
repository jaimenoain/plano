/**
 * CollectionSearchBar.tsx
 *
 * The "search within this collection" row, hosted by `CollectionRailToolbar` so
 * it stays pinned while the list scrolls under it.
 *
 * Draws no border of its own: the toolbar owns the hairline that closes the
 * pinned chrome, and two adjacent borders read as a double rule.
 *
 * Purely presentational — the page owns the query, the filtering and the map.
 * The result count is announced politely because the thing it describes (rows
 * appearing and disappearing further down, pins vanishing from the map) is
 * otherwise invisible to a screen reader.
 */
import { SearchInput } from "@/components/ui/search-input";

interface CollectionSearchBarProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Entries matching the current query. */
  matchCount: number;
  /** Entries in the collection, ignoring the query. */
  totalCount: number;
  /** True once the query has a usable token — drives the count line. */
  isActive: boolean;
  /**
   * Re-frame the map on the matches. Omitted when nothing matched, or when no
   * match has usable coordinates.
   */
  onZoomToResults?: () => void;
}

export function CollectionSearchBar({
  value,
  onValueChange,
  matchCount,
  totalCount,
  isActive,
  onZoomToResults,
}: CollectionSearchBarProps) {
  return (
    <div role="search" className="px-4 pb-3 pt-1">
      <SearchInput
        value={value}
        onValueChange={onValueChange}
        label="Search this collection"
        placeholder="Search name, architect, place…"
      />
      {isActive && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="eyebrow tracking-widest" aria-live="polite">
            {matchCount} of {totalCount} {totalCount === 1 ? "entry" : "entries"}
          </p>
          {onZoomToResults && (
            <button type="button" onClick={onZoomToResults} className="cta-link text-xs">
              Zoom to results
            </button>
          )}
        </div>
      )}
    </div>
  );
}
