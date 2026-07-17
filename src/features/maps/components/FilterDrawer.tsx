import { useMemo } from 'react';
import { ListFilter } from 'lucide-react';
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
import { DiscoveryFiltersPanel } from '@/features/search/components/DiscoveryFiltersPanel';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useBuildingSearchContext } from '@/features/search/context/BuildingSearchContext';
import { QualityRatingFilter } from './filters/QualityRatingFilter';
import { FolderAndCollectionMultiSelect } from './filters/FolderAndCollectionMultiSelect';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { UserSearchResult } from '@/features/search/hooks/useUserSearch';

export function FilterDrawer() {
  const {
    statusFilters: currentStatus,
    setStatusFilters,
    hideVisited: _hideVisited,
    setHideVisited,
    hideSaved,
    setHideSaved,
    filterContacts: _filterContacts,
    setFilterContacts: _setFilterContacts,
    personalMinRating: currentPersonalMinRating,
    setPersonalMinRating,
    globalMinRating: currentGlobalMinRating,
    setGlobalMinRating,
    contactMinRating: _contactMinRating,
    setContactMinRating,
    selectedPeople: currentPeople,
    setSelectedPeople,
    selectedCollections: currentCollectionIds,
    setSelectedCollections,
    selectedFolders: currentFolderIds,
    setSelectedFolders,
    selectedCategory: currentCategory,
    setSelectedCategory,
    selectedTypologies: currentTypologies,
    setSelectedTypologies,
    selectedAttributes: currentMaterialsAndStylesAndContexts,
    setSelectedAttributes,
    selectedContacts: currentContacts,
    setSelectedContacts,
    constructionStatuses,
    setConstructionStatuses,
    showLost,
    setShowLost,
    selectedCreditCompany,
    setSelectedCreditCompany,
    selectedCreditRoles,
    setSelectedCreditRoles,
    awardId,
    setAwardId,
    awardOutcome,
    setAwardOutcome,
    awardYearFrom,
    setAwardYearFrom,
    awardYearTo,
    setAwardYearTo,
    sizeCategories,
    setSizeCategories,
    minSizeSqm,
    setMinSizeSqm,
    maxSizeSqm,
    setMaxSizeSqm,
    minStoreys,
    setMinStoreys,
    maxStoreys,
    setMaxStoreys,
    selectedCenturies,
    setSelectedCenturies,
    mode,
    switchMode,
  } = useBuildingSearchContext();

  const {
    materialityAttributes,
    contextAttributes,
    styleAttributes,
  } = useTaxonomy();

  const handlePeopleFilterChange = (people: { id: string; name: string }[]) => {
    setSelectedPeople(people);
  };

  const handleContactsChange = (newContacts: UserSearchResult[]) => {
    setSelectedContacts(newContacts);

    if (newContacts.length > 0 && currentStatus.length === 0) {
      setStatusFilters(['visited', 'saved', 'pending']);
      setHideSaved(false);
      setHideVisited(false);
    }
  };

  const handleMinRatingChange = (value: number) => {
    setGlobalMinRating(value);
  };

  const handlePersonalRatingChange = (value: number) => {
    setPersonalMinRating(value);
  };

  const handleCollectionsChange = (ids: string[]) => {
    const collections = ids.map(id => ({ id, name: id }));
    setSelectedCollections(collections);
  };

  const handleFoldersChange = (ids: string[]) => {
    const folders = ids.map(id => ({ id, name: id }));
    setSelectedFolders(folders);
  };

  const handleHideSavedChange = (checked: boolean) => {
    setHideSaved(checked);
    setHideVisited(checked);
  };

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      setStatusFilters(['visited', 'saved', 'pending']);
      setHideSaved(false);
      setHideVisited(false);
    } else if (value === 'visited') {
      setStatusFilters(['visited']);
      setHideSaved(true);
      setHideVisited(false);
    } else if (value === 'saved') {
      setStatusFilters(['saved', 'pending']);
      setHideSaved(false);
      setHideVisited(true);
    }
  };

  const currentMaterials = currentMaterialsAndStylesAndContexts.filter(id => materialityAttributes.some(a => a.id === id));
  const currentStyles = currentMaterialsAndStylesAndContexts.filter(id => styleAttributes.some(a => a.id === id));
  const currentContexts = currentMaterialsAndStylesAndContexts.filter(id => contextAttributes.some(a => a.id === id));

  const handleResetGlobalFilters = () => {
    setSelectedPeople([]);
    setSelectedContacts([]);
    setSelectedCategory(null);
    setSelectedTypologies([]);
    setSelectedAttributes([]);
    setConstructionStatuses([]);
    setSelectedCreditCompany(null);
    setSelectedCreditRoles([]);
    setAwardId(null);
    setAwardOutcome(null);
    setAwardYearFrom(null);
    setAwardYearTo(null);
    setSizeCategories([]);
    setMinSizeSqm(null);
    setMaxSizeSqm(null);
    setMinStoreys(null);
    setMaxStoreys(null);
    setSelectedCenturies([]);
  };

  const handleClearAll = () => {
    setSelectedPeople([]);
    setSelectedContacts([]);
    setSelectedCategory(null);
    setSelectedTypologies([]);
    setSelectedAttributes([]);
    setConstructionStatuses([]);
    setPersonalMinRating(0);
    setGlobalMinRating(0);
    setContactMinRating(0);
    setStatusFilters([]);
    setSelectedCollections([]);
    setSelectedFolders([]);
    setSelectedCreditCompany(null);
    setSelectedCreditRoles([]);
    setHideSaved(false);
    setHideVisited(false);
    setSizeCategories([]);
    setMinSizeSqm(null);
    setMaxSizeSqm(null);
    setMinStoreys(null);
    setMaxStoreys(null);
    setSelectedCenturies([]);
    // Clearing filters must not eject the user from the map they chose —
    // restore the current mode's baseline instead (React batches these, so
    // switchMode's companion-filter writes win over the resets above).
    if (mode) switchMode(mode);
  };

  const currentMinRating = currentGlobalMinRating;
  const currentSegmentedStatus = currentStatus.includes('visited') && (currentStatus.includes('saved') || currentStatus.includes('pending'))
    ? 'all'
    : currentStatus.includes('visited')
      ? 'visited'
      : (currentStatus.includes('saved') || currentStatus.includes('pending'))
        ? 'saved'
        : 'all';

  const activeFilterCount = useMemo(() => {
    let count = 0;

    // Global filters
    if (currentPeople.length > 0) count++;
    if (currentContacts.length > 0) count++;
    if (currentCategory) count++;
    if (currentTypologies.length > 0) count++;
    if (currentMaterials.length > 0) count++;
    if (currentContexts.length > 0) count++;
    if (currentStyles.length > 0) count++;
    if (constructionStatuses?.length > 0) count++;
    if (showLost) count++;
    if (selectedCreditCompany) count++;
    if (selectedCreditRoles.length > 0) count++;
    if (sizeCategories.length > 0) count++;
    if (minSizeSqm !== null || maxSizeSqm !== null) count++;
    if (minStoreys !== null || maxStoreys !== null) count++;
    if (selectedCenturies.length > 0) count++;

    if ((mode ?? 'discover') === 'discover') {
      if (currentMinRating > 0) count++;
      if (hideSaved) count++;
    } else if (mode === 'library') {
      if (currentPersonalMinRating > 0) count++;
      if (currentCollectionIds.length > 0) count++;
      if (currentFolderIds.length > 0) count++;
      if (currentStatus.length > 0) count++;
    }
    return count;
  }, [
    mode,
    currentPeople,
    currentContacts,
    currentMinRating,
    hideSaved,
    currentPersonalMinRating,
    currentCollectionIds,
    currentFolderIds,
    currentStatus,
    currentCategory,
    currentTypologies,
    currentMaterials,
    currentContexts,
    currentStyles,
    constructionStatuses,
    showLost,
    selectedCreditCompany,
    selectedCreditRoles,
    selectedCenturies,
  ]);

  const getTierLabel = (value: number) => {
    switch (value) {
      case 0: return 'All';
      case 1: return 'Top 20%';
      case 2: return 'Top 5%';
      case 3: return 'Top 1%';
      default: return 'All';
    }
  };

  const isContactMode = currentContacts.length > 0;
  // The page behaves as Discover until a mode is chosen, so the drawer shows
  // Discover's settings for mode null — matching the page-level MapModeToggle.
  const effectiveMode = isContactMode ? 'library' : (mode ?? 'discover');

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 relative bg-surface-card/90 backdrop-blur-xs border border-border-default rounded-none hover:bg-surface-muted"
          aria-label="Filters"
        >
          <ListFilter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-brand-primary text-[8px] text-brand-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(340px,calc(100vw-2rem))] sm:w-[380px] overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0">
          <SheetTitle>Filters</SheetTitle>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-auto px-2 text-xs text-text-secondary hover:text-text-primary"
            >
              Clear all
            </Button>
          )}
        </SheetHeader>
        <div className="grid gap-6 py-6">
          {/* Mode-specific settings — the Discover / My Library switch itself
              lives on the page (MapModeToggle), not in the drawer */}
          {effectiveMode === 'discover' && (
            <div className="space-y-4">
              <h3 className="eyebrow tracking-widest">
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

              {/* Show only the best */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Show only the best</Label>
                  <span className="text-xs text-text-secondary">{getTierLabel(currentMinRating)}</span>
                </div>
                <Slider
                  defaultValue={[0]}
                  max={3}
                  step={1}
                  value={[currentMinRating]}
                  onValueChange={(values) => handleMinRatingChange(values[0])}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {effectiveMode === 'library' && (
            <div className="space-y-4">
              <h3 className="eyebrow tracking-widest">
                {isContactMode ? 'Contact Filters' : 'Library Settings'}
              </h3>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {isContactMode ? 'Curator Status' : 'Status'}
                </Label>
                <SegmentedControl
                  options={[
                    { label: 'All', value: 'all' },
                    { label: 'Visited', value: 'visited' },
                    { label: 'Bucket List', value: 'saved' },
                  ]}
                  value={currentSegmentedStatus}
                  onValueChange={handleStatusChange}
                  className="w-full"
                />
              </div>

              {/* Personal Rating */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {isContactMode ? 'Your Rating (Overlap)' : 'Your Rating'}
                  </Label>
                  {currentPersonalMinRating > 0 && (
                    <span className="text-xs text-text-secondary">Min {currentPersonalMinRating}</span>
                  )}
                </div>
                <QualityRatingFilter
                  value={currentPersonalMinRating}
                  onChange={handlePersonalRatingChange}
                />
              </div>

              {/* Folders & Collections */}
              {!isContactMode && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="collections" className="border-none">
                    <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">Folders & Collections</AccordionTrigger>
                    <AccordionContent>
                      <FolderAndCollectionMultiSelect
                        selectedCollectionIds={currentCollectionIds.map((c) => c.id)}
                        selectedFolderIds={currentFolderIds.map((f) => f.id)}
                        onCollectionChange={handleCollectionsChange}
                        onFolderChange={handleFoldersChange}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          )}

          <Separator />

          <DiscoveryFiltersPanel
            selectedPeople={currentPeople}
            onPeopleChange={handlePeopleFilterChange}
            selectedCreditCompany={selectedCreditCompany}
            onCreditCompanyChange={setSelectedCreditCompany}
            selectedCreditRoles={selectedCreditRoles}
            onCreditRolesChange={setSelectedCreditRoles}
            selectedCategory={currentCategory}
            onCategoryChange={setSelectedCategory}
            selectedTypologies={currentTypologies}
            onTypologiesChange={setSelectedTypologies}
            selectedAttributes={currentMaterialsAndStylesAndContexts}
            onAttributesChange={setSelectedAttributes}
            constructionStatuses={constructionStatuses ?? []}
            onConstructionStatusesChange={setConstructionStatuses}
            showLost={showLost}
            onShowLostChange={setShowLost}
            selectedContacts={currentContacts}
            onContactsChange={handleContactsChange}
            showContactPicker={mode !== 'library'}
            onResetGlobalFilters={handleResetGlobalFilters}
            awardId={awardId}
            onAwardChange={(award) => setAwardId(award?.id || null)}
            awardOutcome={awardOutcome}
            onAwardOutcomeChange={setAwardOutcome}
            awardYearFrom={awardYearFrom}
            onAwardYearFromChange={setAwardYearFrom}
            awardYearTo={awardYearTo}
            onAwardYearToChange={setAwardYearTo}
            sizeCategories={sizeCategories}
            onSizeCategoriesChange={setSizeCategories}
            minSizeSqm={minSizeSqm}
            onMinSizeSqmChange={setMinSizeSqm}
            maxSizeSqm={maxSizeSqm}
            onMaxSizeSqmChange={setMaxSizeSqm}
            minStoreys={minStoreys}
            onMinStoreysChange={setMinStoreys}
            maxStoreys={maxStoreys}
            onMaxStoreysChange={setMaxStoreys}
            selectedCenturies={selectedCenturies}
            onCenturiesChange={setSelectedCenturies}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
