import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArchitectSelect } from '@/features/search/components/ArchitectSelect';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useMapContext } from '../providers/MapContext';
import { MapMode, MichelinRating } from '@/types/plano-map';
import { QualityRatingFilter } from './filters/QualityRatingFilter';
import { CollectionMultiSelect } from './filters/CollectionMultiSelect';

export function FilterDrawer() {
  const {
    state: { mode, filters },
    methods: { setFilter, setMapState },
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

  const handleArchitectsChange = (architects: { id: string; name: string }[]) => {
    setFilter('architects', architects);
  };

  const handleMinRatingChange = (value: number) => {
    setFilter('minRating', value as MichelinRating);
  };

  const handlePersonalRatingChange = (value: number) => {
    setFilter('personalMinRating', value);
  };

  const handleCollectionsChange = (ids: string[]) => {
    setFilter('collectionIds', ids);
  };

  const handleHideSavedChange = (checked: boolean) => {
    setFilter('hideSaved', checked);
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

    setMapState({
        filters: {
            ...filters,
            ...updates
        }
    });
  };

  // Safe defaults
  const currentMinRating = filters.minRating ?? 0;
  const currentPersonalMinRating = filters.personalMinRating ?? 0;
  const currentStatus = filters.status ?? [];
  const currentArchitects = filters.architects ?? [];
  const currentCollectionIds = filters.collectionIds ?? [];
  const hideSaved = filters.hideSaved ?? false;

  const activeFilterCount = useMemo(() => {
    let count = 0;

    // Global filters
    if (currentArchitects.length > 0) count++;

    if (mode === 'discover') {
      if (currentMinRating > 0) count++;
      // In discover mode, hideSaved being true is a restriction/filter state
      if (hideSaved) count++;
    } else {
      // Library mode
      if (currentPersonalMinRating > 0) count++;
      if (currentCollectionIds.length > 0) count++;
      if (currentStatus.length > 0) count++;
    }
    return count;
  }, [mode, currentArchitects, currentMinRating, hideSaved, currentPersonalMinRating, currentCollectionIds, currentStatus]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 px-4">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[380px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          {/* Mode Switch */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium leading-none">View Mode</h3>
            <SegmentedControl
              options={[
                { label: 'Discover', value: 'discover' },
                { label: 'My Library', value: 'library' },
              ]}
              value={mode}
              onValueChange={handleModeChange}
              className="w-full"
            />
          </div>

          {mode === 'discover' ? (
            /* Discover Mode Section */
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  Discovery Settings
                </h3>

                {/* Hide Saved */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="hide-saved" className="text-sm font-medium cursor-pointer">
                    Hide my saved buildings
                  </Label>
                  <Switch
                    id="hide-saved"
                    checked={hideSaved}
                    onCheckedChange={handleHideSavedChange}
                  />
                </div>

                {/* Community Rating */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Community Rating</Label>
                    {currentMinRating > 0 && (
                      <span className="text-xs text-muted-foreground">Min {currentMinRating}</span>
                    )}
                  </div>
                  <QualityRatingFilter
                    value={currentMinRating}
                    onChange={handleMinRatingChange}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Library Mode Section */
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  Library Settings
                </h3>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <ToggleGroup
                    type="multiple"
                    value={currentStatus}
                    onValueChange={handleStatusChange}
                    className="justify-start flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="visited" aria-label="Toggle visited" className="flex-1">
                      Visited
                    </ToggleGroupItem>
                    <ToggleGroupItem value="saved" aria-label="Toggle saved" className="flex-1">
                      Saved
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pending" aria-label="Toggle pending" className="flex-1">
                      Pending
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Collections */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Collections</Label>
                  <CollectionMultiSelect
                    selectedIds={currentCollectionIds}
                    onChange={handleCollectionsChange}
                  />
                </div>

                {/* Personal Rating */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Your Rating</Label>
                    {currentPersonalMinRating > 0 && (
                      <span className="text-xs text-muted-foreground">Min {currentPersonalMinRating}</span>
                    )}
                  </div>
                  <QualityRatingFilter
                    value={currentPersonalMinRating}
                    onChange={handlePersonalRatingChange}
                  />
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Global Filters Section */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-xs">
              Global Filters
            </h3>

            {/* Architects */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Architects</Label>
              <ArchitectSelect
                selectedArchitects={currentArchitects}
                setSelectedArchitects={handleArchitectsChange}
                placeholder="Search architects..."
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
