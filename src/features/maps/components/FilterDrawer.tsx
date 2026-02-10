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
import { useTaxonomy } from '@/hooks/useTaxonomy';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MultiSelectCheckboxListProps {
  items: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

function MultiSelectCheckboxList({ items, selectedIds, onChange, className }: MultiSelectCheckboxListProps) {
  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(itemId => itemId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground py-2">No items available</div>;
  }

  return (
    <ScrollArea className={cn("h-[200px] w-full border rounded-md p-2", className)}>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox
              id={item.id}
              checked={selectedIds.includes(item.id)}
              onCheckedChange={() => toggleItem(item.id)}
            />
            <Label
              htmlFor={item.id}
              className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {item.name}
            </Label>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function FilterDrawer() {
  const {
    state: { mode, filters },
    methods: { setFilter, setMapState },
  } = useMapContext();

  const {
    functionalCategories,
    functionalTypologies,
    materialityAttributes,
    contextAttributes,
    styleAttributes,
  } = useTaxonomy();

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

  // Taxonomy Handlers
  const handleCategoryChange = (categoryId: string) => {
      // If "all" or empty string is passed, clear the category
      const value = categoryId === "all" ? undefined : categoryId;

      // When category changes, we should verify if selected typologies still belong to this category
      // For simplicity, we might want to clear typologies or filter them.
      // Let's filter them to keep only valid ones for the new category.
      const validTypologies = value
        ? currentTypologies.filter(typId => {
            const typ = functionalTypologies.find(t => t.id === typId);
            return typ && typ.parent_category_id === value;
          })
        : currentTypologies; // If no category selected, all typologies are technically valid (or invalid depending on logic, but usually we allow searching across all)

      setMapState({
          filters: {
              ...filters,
              category: value,
              typologies: validTypologies.length !== currentTypologies.length ? validTypologies : currentTypologies
          }
      });
  };

  const handleTypologiesChange = (ids: string[]) => {
    setFilter('typologies', ids);
  };

  const handleMaterialsChange = (ids: string[]) => {
    setFilter('materials', ids);
  };

  const handleContextsChange = (ids: string[]) => {
    setFilter('contexts', ids);
  };

  const handleStylesChange = (ids: string[]) => {
    setFilter('styles', ids);
  };

  const handleResetGlobalFilters = () => {
      setMapState({
          filters: {
              ...filters,
              architects: undefined,
              category: undefined,
              typologies: undefined,
              materials: undefined,
              contexts: undefined,
              styles: undefined
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

  const currentCategory = filters.category;
  const currentTypologies = filters.typologies ?? [];
  const currentMaterials = filters.materials ?? [];
  const currentContexts = filters.contexts ?? [];
  const currentStyles = filters.styles ?? [];

  const activeFilterCount = useMemo(() => {
    let count = 0;

    // Global filters
    if (currentArchitects.length > 0) count++;
    if (currentCategory) count++;
    if (currentTypologies.length > 0) count++;
    if (currentMaterials.length > 0) count++;
    if (currentContexts.length > 0) count++;
    if (currentStyles.length > 0) count++;

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
  }, [
      mode,
      currentArchitects,
      currentMinRating,
      hideSaved,
      currentPersonalMinRating,
      currentCollectionIds,
      currentStatus,
      currentCategory,
      currentTypologies,
      currentMaterials,
      currentContexts,
      currentStyles
  ]);

  // Derived Data for Display
  const filteredTypologies = useMemo(() => {
      if (!currentCategory) return functionalTypologies;
      return functionalTypologies.filter(t => t.parent_category_id === currentCategory);
  }, [functionalTypologies, currentCategory]);

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
             <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                  Global Filters
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetGlobalFilters}
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                    Reset
                </Button>
            </div>

            <Accordion type="single" collapsible className="w-full">
                {/* Item 1: Architects */}
                <AccordionItem value="architects">
                    <AccordionTrigger className="text-sm">Architects</AccordionTrigger>
                    <AccordionContent>
                        <ArchitectSelect
                            selectedArchitects={currentArchitects}
                            setSelectedArchitects={handleArchitectsChange}
                            placeholder="Search architects..."
                        />
                    </AccordionContent>
                </AccordionItem>

                {/* Item 2: Function */}
                <AccordionItem value="function">
                    <AccordionTrigger className="text-sm">Function</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                         <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                            <Select
                                value={currentCategory || "all"}
                                onValueChange={handleCategoryChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {functionalCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         </div>

                         <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Typology</Label>
                            <MultiSelectCheckboxList
                                items={filteredTypologies}
                                selectedIds={currentTypologies}
                                onChange={handleTypologiesChange}
                                className="h-[150px]"
                            />
                         </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Item 3: Materiality */}
                <AccordionItem value="materiality">
                    <AccordionTrigger className="text-sm">Materiality</AccordionTrigger>
                    <AccordionContent className="pt-2">
                         <MultiSelectCheckboxList
                            items={materialityAttributes}
                            selectedIds={currentMaterials}
                            onChange={handleMaterialsChange}
                        />
                    </AccordionContent>
                </AccordionItem>

                 {/* Item 4: Context & Style */}
                 <AccordionItem value="context-style">
                    <AccordionTrigger className="text-sm">Context & Style</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Context</Label>
                            <MultiSelectCheckboxList
                                items={contextAttributes}
                                selectedIds={currentContexts}
                                onChange={handleContextsChange}
                                className="h-[150px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Style</Label>
                            <MultiSelectCheckboxList
                                items={styleAttributes}
                                selectedIds={currentStyles}
                                onChange={handleStylesChange}
                                className="h-[150px]"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
