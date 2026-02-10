import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArchitectSelect } from '@/features/search/components/ArchitectSelect';
import { useMapContext } from '../providers/MapContext';
import { MichelinRating } from '@/types/plano-map';

export function FilterDrawer() {
  const {
    state: { filters },
    methods: { setFilter, setMapState },
  } = useMapContext();

  const handleArchitectsChange = (architects: { id: string; name: string }[]) => {
    setFilter('architects', architects);
  };

  const handleRatingChange = (value: number[]) => {
    // Slider returns an array, but we only use one value for minRating
    const minRating = value[0] as MichelinRating;
    setFilter('minRating', minRating);
  };

  const handleStatusChange = (value: string[]) => {
    // value is array of strings: "visited", "saved"

    const updates: Partial<typeof filters> = { status: value };

    // If "saved" is selected, ensure hideSaved is false
    if (value.includes('saved')) {
       updates.hideSaved = false;
    }
    // If "visited" is selected, ensure hideVisited is false
    if (value.includes('visited')) {
       updates.hideVisited = false;
    }

    // Use setMapState to batch updates to filters
    // Note: setMapState expects Partial<MapState>, so we wrap filters
    // But we need to merge with existing filters because setMapState replaces the 'filters' object in the URL logic if we just pass a new object?
    // Wait, useURLMapState logic:
    // if (updates.filters !== undefined) { newParams.set('filters', JSON.stringify(updates.filters)); }
    // It REPLACES the filters object.
    // So we MUST merge with existing filters here.

    setMapState({
        filters: {
            ...filters,
            ...updates
        }
    });
  };

  // Safe defaults
  const currentMinRating = filters.minRating ?? 0;
  const currentStatus = filters.status ?? [];
  const currentArchitects = filters.architects ?? [];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 px-4">
          Filters
          {(currentArchitects.length > 0 || currentMinRating > 0 || currentStatus.length > 0) && (
            <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {currentArchitects.length + (currentMinRating > 0 ? 1 : 0) + (currentStatus.length > 0 ? 1 : 0)}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          {/* Architects */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Architects
            </h3>
            <ArchitectSelect
              selectedArchitects={currentArchitects}
              setSelectedArchitects={handleArchitectsChange}
              placeholder="Search architects..."
            />
          </div>

          {/* Rating */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium leading-none">Minimum Rating</h3>
              <span className="text-sm text-muted-foreground">{currentMinRating}</span>
            </div>
            <Slider
              value={[currentMinRating]}
              onValueChange={handleRatingChange}
              max={3}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between px-1 text-xs text-muted-foreground">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium leading-none">Status</h3>
            <ToggleGroup
              type="multiple"
              value={currentStatus}
              onValueChange={handleStatusChange}
              className="justify-start"
            >
              <ToggleGroupItem value="visited" aria-label="Toggle visited">
                Visited
              </ToggleGroupItem>
              <ToggleGroupItem value="saved" aria-label="Toggle saved">
                Saved
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
