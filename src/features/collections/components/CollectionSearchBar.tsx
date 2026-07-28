/**
 * CollectionSearchBar.tsx
 *
 * The "search within this collection" row at the top of the All Items tab.
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
    <div role="search" className="shrink-0 border-b border-border-default px-4 py-3">
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
