/**
 * Always-visible Discover / My Library switch on the search page. The mode
 * was previously buried as a "View Mode" section inside the filter drawer;
 * it is really a page-level destination choice (the world's buildings vs.
 * your own), so it lives on the page itself.
 *
 * `mode` is null until the user picks one — the map behaves like Discover,
 * so Discover is shown as active. Signed-out visitors are sent to log in
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
    if (value !== 'discover' && value !== 'library') return;
    if (value === 'library' && !user) {
      navigate('/auth');
      return;
    }
    if (value === (mode ?? 'discover')) return;
    switchMode(value);
  };

  return (
    <SegmentedControl
      name={name}
      options={[
        { label: 'Discover', value: 'discover' },
        { label: 'My Library', value: 'library' },
      ]}
      value={mode ?? 'discover'}
      onValueChange={handleChange}
      className={className}
    />
  );
}
