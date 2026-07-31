/**
 * The page-level All / Discover / My map switch. The mode was once buried as a
 * "View Mode" section inside the filter drawer; it is really a destination
 * choice (everything, the world minus your own, or only your own), so it lives
 * on the page itself.
 *
 * `mode` is null until the user picks one — null is the "All" state (the whole
 * world, saved/visited included), so All is active by default and is itself
 * selectable to return there.
 *
 * On /map the mode is pinned to the route (`routeMode`), which is what keeps the
 * very first cluster fetch filtered to the member's pins. There the two other
 * segments navigate to /search rather than switching in place: leaving your own
 * map for the whole catalogue is a destination change, and the viewport and
 * global filters travel with it (modeSwitchUrl).
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useAuth } from '@/features/auth';
import { useBuildingSearchContext } from '../context/BuildingSearchContext';
import { modeSwitchUrl } from '../utils/searchUrlParams';

export function MapModeToggle({
  name,
  className,
  routeMode,
}: {
  name: string;
  className?: string;
  /** The route's pinned mode (/map) — its other segments navigate instead. */
  routeMode?: 'library';
}) {
  const { mode, switchMode } = useBuildingSearchContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // A personal library is a dead end signed out: the segment is hidden, so a
  // ?mode=library deep-link would strand the visitor in a mode with no control.
  useEffect(() => {
    if (!user && !routeMode && mode === 'library') switchMode(null);
  }, [user, routeMode, mode, switchMode]);

  const handleChange = (value: string) => {
    if (value !== 'all' && value !== 'discover' && value !== 'library') return;
    if (value === (mode ?? 'all')) return;
    const next = value === 'all' ? null : value;
    if (routeMode) {
      navigate(modeSwitchUrl(searchParams, next));
      return;
    }
    switchMode(next);
  };

  return (
    <SegmentedControl
      name={name}
      options={[
        { label: 'All', value: 'all' },
        { label: 'Discover', value: 'discover' },
        ...(user ? [{ label: 'My map', value: 'library' }] : []),
      ]}
      value={mode ?? 'all'}
      onValueChange={handleChange}
      className={className}
    />
  );
}
