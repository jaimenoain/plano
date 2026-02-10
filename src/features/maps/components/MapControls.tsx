import React from 'react';
import { FilterDrawer } from './FilterDrawer';

export function MapControls() {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
       <FilterDrawer />
    </div>
  );
}
