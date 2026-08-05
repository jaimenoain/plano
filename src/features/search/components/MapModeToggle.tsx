/**
 * The page-level My map / Discover / All switch. The mode was once buried as a
 * "View Mode" section inside the filter drawer; it is really a destination
 * choice (everything, the world minus your own, or only your own), so it lives
 * on the page itself.
 *
 * `mode` is null until the user picks one — null is the "All" state (the whole
 * world, saved/visited included), so All is active by default and is itself
 * selectable to return there.
 *
 * All three segments switch in place — /map and /search are the same route
 * now, with mode always in the URL. `switchMode` (useBuildingSearch) drops the
 * library-only filters (status, rated_by, minRating, folders, collections)
 * whenever the destination stops keeping personal filters, so leaving My map
 * never silently narrows the other modes.
 */
import { useEffect } from 'react';
import { useAuth } from '@/features/auth';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useBuildingSearchContext } from '../context/BuildingSearchContext';

export function MapModeToggle({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const { mode, switchMode } = useBuildingSearchContext();
  const { user } = useAuth();

  // A personal library is a dead end signed out: the segment is hidden, so a
  // ?mode=library deep-link would strand the visitor in a mode with no
  // control. (The route loader also redirects this case to /login.)
  useEffect(() => {
    if (!user && mode === 'library') switchMode(null);
  }, [user, mode, switchMode]);

  const handleChange = (value: string) => {
    if (value !== 'all' && value !== 'discover' && value !== 'library') return;
    if (value === (mode ?? 'all')) return;
    switchMode(value === 'all' ? null : value);
  };

  return (
    <SegmentedControl
      name={name}
      options={[
        ...(user ? [{ label: 'My map', value: 'library' }] : []),
        { label: 'Discover', value: 'discover' },
        { label: 'All', value: 'all' },
      ]}
      value={mode ?? 'all'}
      onValueChange={handleChange}
      className={className}
    />
  );
}
