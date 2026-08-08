/**
 * CollectionDiscoverySettings.tsx
 *
 * The Map View tab's discovery control: draw every building in view so the
 * collection can be built straight from the map.
 *
 * It switches the *source* on. Whether the collection's own pins step aside to
 * leave only what could still be added is no longer a second switch buried
 * here — it is the rail's Collection / Discover / All toggle, which says it in
 * one place and applies to the list at the same time (ADR 0026).
 *
 * Like the Saved Places controls beside it, this is a per-viewer preference
 * that applies the moment it is switched — deliberately NOT part of the
 * dialog's `formData`, and it must not wait for "Save Changes".
 *
 * Task 5.7 adds three filters, all applying immediately for the same reason:
 * a quality-tier toggle, an era multi-select, and a collapsible "More filters"
 * panel reusing the same `DiscoveryFiltersPanel` the main map uses.
 */
import { useMemo, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CENTURY_FILTER_ITEMS, parseCenturyIds } from "@/lib/century";
import { DiscoveryFiltersPanel, MultiSelectCheckboxList } from "@/features/search";
import type { CreditRole } from "@/features/credits";
import type { MapFilters } from "@/types/plano-map";
import type { DiscoveryTierFilter } from "../types";
import { SHOW_BY_ITEM_SELECTED } from "./mapViewToggleStyles";

const DISCOVERY_TIER_ITEMS: { value: DiscoveryTierFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Top 20%", label: "Top 20%" },
  { value: "Top 10%", label: "Top 10%" },
  { value: "Top 5%", label: "Top 5%" },
  { value: "Top 1%", label: "Top 1%" },
];

/** How many of the standard building filters are currently set, for the "More filters" badge. */
function countStandardFilters(filters: Partial<MapFilters>): number {
  let count = 0;
  if (filters.category) count++;
  if (filters.typologies?.length) count++;
  if (filters.attributes?.length) count++;
  if (filters.people?.length) count++;
  if (filters.creditCompany) count++;
  if (filters.creditRoles?.length) count++;
  if (filters.constructionStatuses?.length) count++;
  if (filters.showLost) count++;
  if (filters.awardId) count++;
  if (filters.sizeCategories?.length) count++;
  if (filters.minSizeSqm) count++;
  if (filters.maxSizeSqm) count++;
  if (filters.minStoreys) count++;
  if (filters.maxStoreys) count++;
  return count;
}

interface CollectionDiscoverySettingsProps {
  showAllBuildings: boolean;
  onShowAllBuildingsChange: (value: boolean) => void;
  discoveryTierFilter?: DiscoveryTierFilter;
  onDiscoveryTierFilterChange?: (filter: DiscoveryTierFilter) => void;
  discoveryCenturies?: number[];
  onDiscoveryCenturiesChange?: (centuries: number[]) => void;
  discoveryStandardFilters?: Partial<MapFilters>;
  onDiscoveryStandardFiltersChange?: (filters: Partial<MapFilters>) => void;
}

export function CollectionDiscoverySettings({
  showAllBuildings,
  onShowAllBuildingsChange,
  discoveryTierFilter = "all",
  onDiscoveryTierFilterChange,
  discoveryCenturies = [],
  onDiscoveryCenturiesChange,
  discoveryStandardFilters = {},
  onDiscoveryStandardFiltersChange,
}: CollectionDiscoverySettingsProps) {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const standardFilterCount = useMemo(
    () => countStandardFilters(discoveryStandardFilters),
    [discoveryStandardFilters],
  );

  const updateStandardFilters = (patch: Partial<MapFilters>) => {
    onDiscoveryStandardFiltersChange?.({ ...discoveryStandardFilters, ...patch });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="show-all-buildings" className="flex flex-col space-y-1">
          <span>Show All Buildings</span>
          <span className="font-normal text-xs text-text-secondary">
            Explore every building on the map so you can add them to this collection
          </span>
        </Label>
        <Switch
          id="show-all-buildings"
          checked={showAllBuildings}
          onCheckedChange={onShowAllBuildingsChange}
        />
      </div>

      {showAllBuildings && (
        <>
          <Alert className="py-3">
            <Info className="size-4 shrink-0" aria-hidden />
            <AlertDescription className="text-xs">
              These buildings are not part of this collection. Tap one to see it and add it. Use the
              Collection / Discover / All toggle above the list to choose which of them you see.
              Only you see this view.
            </AlertDescription>
          </Alert>

          <div className="rounded-none border border-border-default bg-surface-muted/40 p-3 space-y-4">
            {onDiscoveryTierFilterChange && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-primary">Show by tier</Label>
                <p className="text-xs text-text-secondary">
                  Limit to buildings in this quality tier or higher. All shows every building.
                </p>
                <ToggleGroup
                  type="single"
                  value={discoveryTierFilter}
                  onValueChange={(v) => {
                    if (v) onDiscoveryTierFilterChange(v as DiscoveryTierFilter);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-wrap justify-start gap-1"
                  aria-label="Filter discovered buildings by quality tier"
                >
                  {DISCOVERY_TIER_ITEMS.map((item) => (
                    <ToggleGroupItem
                      key={item.value}
                      value={item.value}
                      className={`min-h-[44px] items-center justify-center px-2 md:min-h-9 ${SHOW_BY_ITEM_SELECTED}`}
                    >
                      {item.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}

            {onDiscoveryCenturiesChange && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-primary">Era</Label>
                <p className="text-xs text-text-secondary">
                  Show buildings completed in the selected centuries. Leave empty to show every era.
                </p>
                <MultiSelectCheckboxList
                  items={CENTURY_FILTER_ITEMS}
                  selectedIds={discoveryCenturies.map(String)}
                  onChange={(ids) => onDiscoveryCenturiesChange(parseCenturyIds(ids))}
                />
              </div>
            )}

            {onDiscoveryStandardFiltersChange && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-between px-0 text-sm font-medium text-text-primary hover:bg-transparent"
                  onClick={() => setMoreFiltersOpen((v) => !v)}
                  aria-expanded={moreFiltersOpen}
                >
                  <span className="flex items-center gap-2">
                    More filters
                    {standardFilterCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                        {standardFilterCount}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown
                    className={cn("size-4 transition-transform", moreFiltersOpen && "rotate-180")}
                    aria-hidden
                  />
                </Button>
                {moreFiltersOpen && (
                  <DiscoveryFiltersPanel
                    selectedPeople={discoveryStandardFilters.people ?? []}
                    onPeopleChange={(people) => updateStandardFilters({ people })}
                    selectedCreditCompany={discoveryStandardFilters.creditCompany ?? null}
                    onCreditCompanyChange={(creditCompany) =>
                      updateStandardFilters({ creditCompany: creditCompany ?? undefined })
                    }
                    selectedCreditRoles={(discoveryStandardFilters.creditRoles as CreditRole[] | undefined) ?? []}
                    onCreditRolesChange={(creditRoles) => updateStandardFilters({ creditRoles })}
                    selectedCategory={discoveryStandardFilters.category ?? null}
                    onCategoryChange={(category) => updateStandardFilters({ category: category ?? undefined })}
                    selectedTypologies={discoveryStandardFilters.typologies ?? []}
                    onTypologiesChange={(typologies) => updateStandardFilters({ typologies })}
                    selectedAttributes={[
                      ...(discoveryStandardFilters.attributes ?? []),
                      ...(discoveryStandardFilters.materials ?? []),
                      ...(discoveryStandardFilters.styles ?? []),
                      ...(discoveryStandardFilters.contexts ?? []),
                    ]}
                    onAttributesChange={(attributes) => updateStandardFilters({ attributes })}
                    constructionStatuses={discoveryStandardFilters.constructionStatuses ?? []}
                    onConstructionStatusesChange={(constructionStatuses) =>
                      updateStandardFilters({ constructionStatuses })
                    }
                    showLost={discoveryStandardFilters.showLost ?? false}
                    onShowLostChange={(showLost) => updateStandardFilters({ showLost })}
                    showContactPicker={false}
                    showResetRow
                    onResetGlobalFilters={() => onDiscoveryStandardFiltersChange({})}
                    awardId={discoveryStandardFilters.awardId ?? null}
                    onAwardChange={(award) => updateStandardFilters({ awardId: award?.id ?? undefined })}
                    awardOutcome={discoveryStandardFilters.awardOutcome ?? null}
                    onAwardOutcomeChange={(awardOutcome) =>
                      updateStandardFilters({ awardOutcome: awardOutcome ?? undefined })
                    }
                    awardYearFrom={discoveryStandardFilters.awardYearFrom ?? null}
                    onAwardYearFromChange={(awardYearFrom) =>
                      updateStandardFilters({ awardYearFrom: awardYearFrom ?? undefined })
                    }
                    awardYearTo={discoveryStandardFilters.awardYearTo ?? null}
                    onAwardYearToChange={(awardYearTo) =>
                      updateStandardFilters({ awardYearTo: awardYearTo ?? undefined })
                    }
                    sizeCategories={discoveryStandardFilters.sizeCategories ?? []}
                    onSizeCategoriesChange={(sizeCategories) => updateStandardFilters({ sizeCategories })}
                    minSizeSqm={discoveryStandardFilters.minSizeSqm ?? null}
                    onMinSizeSqmChange={(minSizeSqm) => updateStandardFilters({ minSizeSqm: minSizeSqm ?? undefined })}
                    maxSizeSqm={discoveryStandardFilters.maxSizeSqm ?? null}
                    onMaxSizeSqmChange={(maxSizeSqm) => updateStandardFilters({ maxSizeSqm: maxSizeSqm ?? undefined })}
                    minStoreys={discoveryStandardFilters.minStoreys ?? null}
                    onMinStoreysChange={(minStoreys) => updateStandardFilters({ minStoreys: minStoreys ?? undefined })}
                    maxStoreys={discoveryStandardFilters.maxStoreys ?? null}
                    onMaxStoreysChange={(maxStoreys) => updateStandardFilters({ maxStoreys: maxStoreys ?? undefined })}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
