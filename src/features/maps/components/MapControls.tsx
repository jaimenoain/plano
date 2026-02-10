import React from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { FilterDrawer } from './FilterDrawer';
import { useMapContext } from '../providers/MapContext';
import { MapMode } from '@/types/plano-map';

export function MapControls() {
  const {
    state: { mode, filters },
    methods: { setMapState },
  } = useMapContext();

  const handleModeChange = (newMode: string) => {
    const typedMode = newMode as MapMode;

    if (typedMode === 'discover') {
      // Switch to Discover mode:
      // - Clear status (so we see everything relevant to discovery)
      // - Hide saved items by default
      // - Keep other filters (architects, rating, etc.)

      setMapState({
        mode: typedMode,
        filters: {
          ...filters,
          status: undefined,
          hideSaved: true,
          // We don't touch hideVisited, assuming user might have set it
        },
      });
    } else {
      // Switch to Library mode:
      // - Set status to ['visited', 'saved'] to show user's collection
      // - Ensure we show saved/visited items by disabling hide flags

      setMapState({
        mode: typedMode,
        filters: {
          ...filters,
          status: ['visited', 'saved'],
          hideSaved: false,
          hideVisited: false,
        },
      });
    }
  };

  return (
    <div className="pointer-events-auto flex items-center gap-2">
       <SegmentedControl
          options={[
            { label: 'Discover', value: 'discover' },
            { label: 'My Library', value: 'library' },
          ]}
          value={mode}
          onValueChange={handleModeChange}
          className="w-[200px] bg-background/80 backdrop-blur-sm shadow-sm"
       />
       <FilterDrawer />
    </div>
  );
}
