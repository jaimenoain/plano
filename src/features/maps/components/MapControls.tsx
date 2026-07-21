import { FilterDrawer } from './FilterDrawer';

/**
 * `compact` renders the filter trigger as an icon-only square (used in the
 * space-constrained mobile floating bar); the default is the labelled
 * "Filters" button used in the desktop sidebar header.
 */
export function MapControls({ compact = false }: { compact?: boolean }) {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
       <FilterDrawer compact={compact} />
    </div>
  );
}
