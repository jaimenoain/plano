import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PersonFilterSelect } from "@/features/search/components/PersonFilterSelect";
import { CompanyMapFilterSelect } from "@/features/search/components/CompanyMapFilterSelect";
import { AwardFilterSelect } from "@/features/awards/components/AwardFilterSelect";
import { CREDIT_ROLES } from "@/features/credits/api/credits";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import type { CreditRole } from "@/features/credits/types";
import { ContactPicker } from "@/features/search/components/ContactPicker";
import { useTaxonomy } from "@/hooks/useTaxonomy";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CENTURY_FILTER_ITEMS, parseCenturyIds } from "@/lib/century";
import type { UserSearchResult } from "@/features/search/hooks/useUserSearch";

interface MultiSelectCheckboxListProps {
  items: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function MultiSelectCheckboxList({
  items,
  selectedIds,
  onChange,
  className,
}: MultiSelectCheckboxListProps) {
  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((itemId) => itemId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-xs text-text-secondary py-2">No items available</div>
    );
  }

  return (
    <ScrollArea
      className={cn("h-[200px] w-full border rounded-sm p-2", className)}
    >
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

export interface DiscoveryFiltersPanelProps {
  selectedPeople: { id: string; name: string }[];
  onPeopleChange: (people: { id: string; name: string }[]) => void;
  selectedCreditCompany: { id: string; name: string } | null;
  onCreditCompanyChange: (c: { id: string; name: string } | null) => void;
  selectedCreditRoles: CreditRole[];
  onCreditRolesChange: (roles: CreditRole[]) => void;
  selectedCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  selectedTypologies: string[];
  onTypologiesChange: (ids: string[]) => void;
  selectedAttributes: string[];
  onAttributesChange: (ids: string[]) => void;
  constructionStatuses: string[];
  onConstructionStatusesChange: (ids: string[]) => void;
  showLost?: boolean;
  onShowLostChange?: (next: boolean) => void;
  selectedContacts?: UserSearchResult[];
  onContactsChange?: (contacts: UserSearchResult[]) => void;
  /** When false, Curators & Friends is omitted (e.g. map My Library mode). */
  showContactPicker?: boolean;
  showResetRow?: boolean;
  onResetGlobalFilters?: () => void;
  awardId?: string | null;
  onAwardChange?: (award: { id: string; name: string } | null) => void;
  awardOutcome?: string | null;
  onAwardOutcomeChange?: (outcome: string | null) => void;
  awardYearFrom?: number | null;
  onAwardYearFromChange?: (year: number | null) => void;
  awardYearTo?: number | null;
  onAwardYearToChange?: (year: number | null) => void;
  sizeCategories?: string[];
  onSizeCategoriesChange?: (categories: string[]) => void;
  minSizeSqm?: number | null;
  onMinSizeSqmChange?: (val: number | null) => void;
  maxSizeSqm?: number | null;
  onMaxSizeSqmChange?: (val: number | null) => void;
  minStoreys?: number | null;
  onMinStoreysChange?: (val: number | null) => void;
  maxStoreys?: number | null;
  onMaxStoreysChange?: (val: number | null) => void;
  selectedCenturies?: number[];
  onCenturiesChange?: (centuries: number[]) => void;
}

export function DiscoveryFiltersPanel({
  selectedPeople: currentPeople,
  onPeopleChange,
  selectedCreditCompany,
  onCreditCompanyChange,
  selectedCreditRoles,
  onCreditRolesChange,
  selectedCategory: currentCategory,
  onCategoryChange,
  selectedTypologies: currentTypologies,
  onTypologiesChange,
  selectedAttributes: currentMaterialsAndStylesAndContexts,
  onAttributesChange,
  constructionStatuses,
  onConstructionStatusesChange,
  showLost = false,
  onShowLostChange,
  selectedContacts = [],
  onContactsChange,
  showContactPicker = true,
  showResetRow = true,
  onResetGlobalFilters,
  awardId,
  onAwardChange,
  awardOutcome,
  onAwardOutcomeChange,
  awardYearFrom,
  onAwardYearFromChange,
  awardYearTo,
  onAwardYearToChange,
  sizeCategories = [],
  onSizeCategoriesChange,
  minSizeSqm,
  onMinSizeSqmChange,
  maxSizeSqm,
  onMaxSizeSqmChange,
  minStoreys,
  onMinStoreysChange,
  maxStoreys,
  onMaxStoreysChange,
  selectedCenturies = [],
  onCenturiesChange,
}: DiscoveryFiltersPanelProps) {
  const {
    functionalCategories,
    functionalTypologies,
    materialityAttributes,
    contextAttributes,
    styleAttributes,
  } = useTaxonomy();

  const handleCategoryChange = (categoryId: string) => {
    const value = categoryId === "all" ? null : categoryId;
    onCategoryChange(value);

    const validTypologies = value
      ? currentTypologies.filter((typId) => {
          const typ = functionalTypologies.find((t) => t.id === typId);
          return typ && typ.parent_category_id === value;
        })
      : currentTypologies;

    if (validTypologies.length !== currentTypologies.length) {
      onTypologiesChange(validTypologies);
    }
  };

  const currentMaterials = currentMaterialsAndStylesAndContexts.filter((id) =>
    materialityAttributes.some((a) => a.id === id)
  );
  const currentStyles = currentMaterialsAndStylesAndContexts.filter((id) =>
    styleAttributes.some((a) => a.id === id)
  );
  const currentContexts = currentMaterialsAndStylesAndContexts.filter((id) =>
    contextAttributes.some((a) => a.id === id)
  );

  const handleMaterialsChange = (ids: string[]) => {
    const otherAttributes = currentMaterialsAndStylesAndContexts.filter(
      (id) => !materialityAttributes.some((a) => a.id === id)
    );
    onAttributesChange([...otherAttributes, ...ids]);
  };

  const handleContextsChange = (ids: string[]) => {
    const otherAttributes = currentMaterialsAndStylesAndContexts.filter(
      (id) => !contextAttributes.some((a) => a.id === id)
    );
    onAttributesChange([...otherAttributes, ...ids]);
  };

  const handleStylesChange = (ids: string[]) => {
    const otherAttributes = currentMaterialsAndStylesAndContexts.filter(
      (id) => !styleAttributes.some((a) => a.id === id)
    );
    onAttributesChange([...otherAttributes, ...ids]);
  };

  const creditRoleItems = useMemo(
    () =>
      CREDIT_ROLES.map((role) => ({
        id: role,
        name: formatCreditRoleLabel(role, null),
      })),
    []
  );

  const filteredTypologies = useMemo(() => {
    if (!currentCategory) return functionalTypologies;
    return functionalTypologies.filter(
      (t) => t.parent_category_id === currentCategory
    );
  }, [functionalTypologies, currentCategory]);

  const handleCreditRolesChange = (ids: string[]) => {
    onCreditRolesChange(ids as CreditRole[]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider text-xs">
          Global filters
        </h3>
        {showResetRow && onResetGlobalFilters && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onResetGlobalFilters}
            className="h-auto p-0 text-xs text-text-secondary hover:text-text-primary"
          >
            Reset
          </Button>
        )}
      </div>

      <Accordion type="single" collapsible className="w-full">
        {showContactPicker && onContactsChange && (
          <AccordionItem value="curators">
            <AccordionTrigger className="text-sm">
              Curators &amp; friends
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-text-secondary mb-3">
                Show buildings someone you follow has saved, visited, or rated.
              </p>
              <ContactPicker
                selectedContacts={selectedContacts}
                setSelectedContacts={onContactsChange}
                placeholder="Search people..."
              />
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="credits">
          <AccordionTrigger className="text-sm">Credits</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                People &amp; offices
              </Label>
              <PersonFilterSelect
                selectedPeople={currentPeople}
                setSelectedPeople={onPeopleChange}
                placeholder="Search people..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                Company
              </Label>
              <CompanyMapFilterSelect
                selectedCompany={selectedCreditCompany}
                setSelectedCompany={onCreditCompanyChange}
                placeholder="Search companies…"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                Role
              </Label>
              <MultiSelectCheckboxList
                items={creditRoleItems}
                selectedIds={selectedCreditRoles}
                onChange={handleCreditRolesChange}
                className="h-[180px]"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="function">
          <AccordionTrigger className="text-sm">Function</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                Category
              </Label>
              <Select
                value={currentCategory || "all"}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {functionalCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                Typology
              </Label>
              <MultiSelectCheckboxList
                items={filteredTypologies}
                selectedIds={currentTypologies}
                onChange={onTypologiesChange}
                className="h-[150px]"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

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

        <AccordionItem value="style">
          <AccordionTrigger className="text-sm">Style</AccordionTrigger>
          <AccordionContent className="pt-2">
            <MultiSelectCheckboxList
              items={styleAttributes}
              selectedIds={currentStyles}
              onChange={handleStylesChange}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="context">
          <AccordionTrigger className="text-sm">Context</AccordionTrigger>
          <AccordionContent className="pt-2">
            <MultiSelectCheckboxList
              items={contextAttributes}
              selectedIds={currentContexts}
              onChange={handleContextsChange}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="construction_status">
          <AccordionTrigger className="text-sm">Building status</AccordionTrigger>
          <AccordionContent className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="show-lost-toggle"
                className="text-sm font-normal cursor-pointer"
              >
                Show lost buildings
              </Label>
              <Switch
                id="show-lost-toggle"
                checked={showLost}
                onCheckedChange={(next) => onShowLostChange?.(next)}
                aria-label="Show lost buildings"
              />
            </div>
            <MultiSelectCheckboxList
              items={[
                { id: "Built", name: "Built" },
                { id: "Under Construction", name: "Under Construction" },
                { id: "Temporary", name: "Temporary" },
                { id: "Unbuilt", name: "Unbuilt" },
                { id: "Lost", name: "Lost" },
              ]}
              selectedIds={constructionStatuses || []}
              onChange={onConstructionStatusesChange}
              className="h-[180px]"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="century">
          <AccordionTrigger className="text-sm">Century</AccordionTrigger>
          <AccordionContent className="pt-2">
            <MultiSelectCheckboxList
              items={CENTURY_FILTER_ITEMS}
              selectedIds={selectedCenturies.map(String)}
              onChange={(ids) => onCenturiesChange?.(parseCenturyIds(ids))}
              className="h-[320px]"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="awards">
          <AccordionTrigger className="text-sm">Awards</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                Specific Award
              </Label>
              <AwardFilterSelect
                selectedAwardId={awardId || null}
                onAwardChange={onAwardChange || (() => {})}
                placeholder="Search awards..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                Outcome
              </Label>
              <Select
                value={awardOutcome || "any"}
                onValueChange={(val) => onAwardOutcomeChange?.(val === "any" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Outcome</SelectItem>
                  <SelectItem value="winner">Winner</SelectItem>
                  <SelectItem value="finalist">Finalist</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-text-secondary">
                  Year From
                </Label>
                <Select
                  value={awardYearFrom?.toString() || "any"}
                  onValueChange={(val) => onAwardYearFromChange?.(val === "any" ? null : parseInt(val, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-text-secondary">
                  Year To
                </Label>
                <Select
                  value={awardYearTo?.toString() || "any"}
                  onValueChange={(val) => onAwardYearToChange?.(val === "any" ? null : parseInt(val, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="size">
          <AccordionTrigger className="text-sm">Size</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                Category
              </Label>
              <MultiSelectCheckboxList
                items={[
                  { id: "xs", name: "XS" },
                  { id: "s", name: "S" },
                  { id: "m", name: "M" },
                  { id: "l", name: "L" },
                  { id: "xl", name: "XL" },
                  { id: "xxl", name: "XXL" },
                ]}
                selectedIds={sizeCategories}
                onChange={onSizeCategoriesChange || (() => {})}
                className="h-[150px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                Size (sqm)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={minSizeSqm?.toString() || "any"}
                  onValueChange={(val) => onMinSizeSqmChange?.(val === "any" ? null : parseInt(val, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Min sqm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Min</SelectItem>
                    {[0, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000].map((val) => (
                      <SelectItem key={val} value={val.toString()}>
                        {val.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={maxSizeSqm?.toString() || "any"}
                  onValueChange={(val) => onMaxSizeSqmChange?.(val === "any" ? null : parseInt(val, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Max sqm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Max</SelectItem>
                    {[50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000].map((val) => (
                      <SelectItem key={val} value={val.toString()}>
                        {val.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-text-secondary">
                Storeys
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={minStoreys?.toString() || "any"}
                  onValueChange={(val) => onMinStoreysChange?.(val === "any" ? null : parseInt(val, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Min</SelectItem>
                    {[1, 2, 3, 4, 5, 10, 20, 30, 40, 50].map((val) => (
                      <SelectItem key={val} value={val.toString()}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={maxStoreys?.toString() || "any"}
                  onValueChange={(val) => onMaxStoreysChange?.(val === "any" ? null : parseInt(val, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Max" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Max</SelectItem>
                    {[1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 100].map((val) => (
                      <SelectItem key={val} value={val.toString()}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
