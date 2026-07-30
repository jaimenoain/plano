/**
 * Always-visible All / Discover switch on the search page. The mode was
 * previously buried as a "View Mode" section inside the filter drawer; it is
 * really a page-level destination choice (everything, or the world's
 * buildings minus your own), so it lives on the page itself.
 *
 * `mode` is null until the user picks one — null is the "All" state (the whole
 * world, saved/visited included), so All is shown as active by default and is
 * itself selectable to return there. The member's own library is no longer a
 * segment here: it has a first-class address at /map, one tap away in every
 * nav surface, and a segment that navigates away could never render selected.
 */
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useBuildingSearchContext } from '../context/BuildingSearchContext';

export function MapModeToggle({ name, className }: { name: string; className?: string }) {
  const { mode, switchMode } = useBuildingSearchContext();

  const handleChange = (value: string) => {
    if (value !== 'all' && value !== 'discover') return;
    if (value === (mode ?? 'all')) return;
    switchMode(value === 'all' ? null : value);
  };

  return (
    <SegmentedControl
      name={name}
      options={[
        { label: 'All', value: 'all' },
        { label: 'Discover', value: 'discover' },
      ]}
      value={mode ?? 'all'}
      onValueChange={handleChange}
      className={className}
    />
  );
}
