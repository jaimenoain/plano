/**
 * Always-visible All / Discover / My Library switch on the search page. The
 * mode was previously buried as a "View Mode" section inside the filter
 * drawer; it is really a page-level destination choice (everything, the
 * world's buildings minus your own, or just your own), so it lives on the
 * page itself.
 *
 * `mode` is null until the user picks one — null is the "All" state (the whole
 * world, saved/visited included), so All is shown as active by default and is
 * itself selectable to return there. Signed-out visitors are sent to log in
 * when they tap My Library (an empty personal map is a dead end).
 */
import { useNavigate } from 'react-router';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useAuth } from '@/features/auth';
import { useBuildingSearchContext } from '../context/BuildingSearchContext';

export function MapModeToggle({ name, className }: { name: string; className?: string }) {
  const { mode, switchMode } = useBuildingSearchContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (value: string) => {
    if (value !== 'all' && value !== 'discover' && value !== 'library') return;
    if (value === 'library' && !user) {
      navigate('/auth');
      return;
    }
    if (value === (mode ?? 'all')) return;
    switchMode(value === 'all' ? null : value);
  };

  return (
    <SegmentedControl
      name={name}
      options={[
        { label: 'All', value: 'all' },
        { label: 'Discover', value: 'discover' },
        { label: 'My Library', value: 'library' },
      ]}
      value={mode ?? 'all'}
      onValueChange={handleChange}
      className={className}
    />
  );
}
