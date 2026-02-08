import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Filter, X, Check, ChevronsUpDown, Info } from "lucide-react";
import { ArchitectSelect } from "./ArchitectSelect";
import { ContactPicker } from "./ContactPicker";
import { useBuildingMetadata } from "@/hooks/useBuildingMetadata";
import { UserSearchResult } from "../hooks/useUserSearch";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  // Status Filters
  statusFilters: string[];
  setStatusFilters: (filters: string[]) => void;

  // Visibility Filters
  hideVisited: boolean;
  setHideVisited: (hide: boolean) => void;
  hideSaved: boolean;
  setHideSaved: (hide: boolean) => void;
  hideHidden: boolean;
  setHideHidden: (hide: boolean) => void;
  hideWithoutImages: boolean;
  setHideWithoutImages: (hide: boolean) => void;

  // Rating Filters
  personalMinRating: number;
  setPersonalMinRating: (rating: number) => void;
  contactMinRating: number;
  setContactMinRating: (rating: number) => void;

  // Social Filters
  filterContacts: boolean;
  setFilterContacts: (filter: boolean) => void;
  selectedContacts: UserSearchResult[];
  setSelectedContacts: (contacts: UserSearchResult[]) => void;

  // Characteristic Filters
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedTypologies: string[];
  setSelectedTypologies: (typologies: string[]) => void;
  selectedAttributes: string[];
  setSelectedAttributes: (attributes: string[]) => void;
  selectedArchitects: { id: string; name: string }[];
  setSelectedArchitects: (architects: { id: string; name: string }[]) => void;
  selectedCollections: { id: string; name: string }[];
  setSelectedCollections: (collections: { id: string; name: string }[]) => void;

  // Available Data
  availableCollections?: { id: string; name: string }[];
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  searchPlaceholder
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = selected
    .map((val) => options.find((opt) => opt.value === val)?.label)
    .filter(Boolean);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[40px] px-3 py-2 text-left font-normal"
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selectedLabels.map((label, i) => (
               <Badge key={i} variant="secondary" className="mr-1 mb-1">
                 {label}
               </Badge>
            ))}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-4 w-4")} />
                  </div>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function SearchFilters(props: SearchFiltersProps) {
  const {
    categories,
    typologies,
    attributeGroups,
    attributes
  } = useBuildingMetadata();

  const activeFiltersCount = [
    props.statusFilters.length > 0,
    props.hideVisited,
    props.hideSaved,
    !props.hideHidden, // default is true, so if false (showing hidden) it's a change? Or vice versa. Logic says hideHidden=true is default filter.
    props.hideWithoutImages,
    props.personalMinRating > 0,
    props.contactMinRating > 0,
    props.filterContacts,
    props.selectedContacts.length > 0,
    props.selectedCategory,
    props.selectedTypologies.length > 0,
    props.selectedAttributes.length > 0,
    props.selectedArchitects.length > 0,
    props.selectedCollections.length > 0
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    props.setStatusFilters([]);
    props.setHideVisited(false);
    props.setHideSaved(false);
    props.setHideHidden(true); // Reset to default
    props.setHideWithoutImages(false);
    props.setPersonalMinRating(0);
    props.setContactMinRating(0);
    props.setFilterContacts(false);
    props.setSelectedContacts([]);
    props.setSelectedCategory(null);
    props.setSelectedTypologies([]);
    props.setSelectedAttributes([]);
    props.setSelectedArchitects([]);
    props.setSelectedCollections([]);
  };

  // Filter typologies based on selected category
  const filteredTypologies = useMemo(() => {
    if (!props.selectedCategory) return typologies;
    return typologies.filter(t => t.parent_category_id === props.selectedCategory);
  }, [typologies, props.selectedCategory]);

  const typologyOptions = filteredTypologies.map(t => ({ value: t.id, label: t.name }));

  // Group attributes by group
  const attributeOptions = attributes.map(a => ({ value: a.id, label: a.name }));

  const collectionOptions = (props.availableCollections || []).map(c => ({ value: c.id, label: c.name }));

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 relative">
          <Filter className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border border-background" />
          )}
          <span className="sr-only">Filters</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 h-full">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            Filters
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-auto p-0 text-muted-foreground hover:text-foreground text-xs font-normal"
              >
                Clear all
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            Refine your search results
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="flex flex-col gap-6 py-6">
            {/* Status Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Status</h4>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-visited"
                    checked={props.statusFilters.includes('visited')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        props.setStatusFilters([...props.statusFilters, 'visited']);
                      } else {
                        props.setStatusFilters(props.statusFilters.filter(s => s !== 'visited'));
                      }
                    }}
                  />
                  <label htmlFor="status-visited" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Visited
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status-saved"
                    checked={props.statusFilters.includes('saved')} // Assuming 'saved' maps to 'pending' in backend logic but UI usually says 'Saved' or 'Pending'
                    onCheckedChange={(checked) => {
                      if (checked) {
                        props.setStatusFilters([...props.statusFilters, 'saved']);
                      } else {
                        props.setStatusFilters(props.statusFilters.filter(s => s !== 'saved'));
                      }
                    }}
                  />
                  <label htmlFor="status-saved" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Saved
                  </label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Visibility Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Visibility</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="hide-visited" className="text-sm">Hide Visited</label>
                  <Checkbox
                    id="hide-visited"
                    checked={props.hideVisited}
                    onCheckedChange={(c) => props.setHideVisited(!!c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="hide-saved" className="text-sm">Hide Saved</label>
                  <Checkbox
                    id="hide-saved"
                    checked={props.hideSaved}
                    onCheckedChange={(c) => props.setHideSaved(!!c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="hide-hidden" className="text-sm">Hide Hidden</label>
                  <Checkbox
                    id="hide-hidden"
                    checked={props.hideHidden}
                    onCheckedChange={(c) => props.setHideHidden(!!c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="hide-images" className="text-sm">Must Have Images</label>
                  <Checkbox
                    id="hide-images"
                    checked={props.hideWithoutImages}
                    onCheckedChange={(c) => props.setHideWithoutImages(!!c)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Ratings Section */}
            <div className="space-y-6">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Ratings</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">My Minimum Rating</label>
                  <span className="text-sm text-muted-foreground">{props.personalMinRating > 0 ? props.personalMinRating : 'Any'}</span>
                </div>
                <Slider
                  value={[props.personalMinRating]}
                  min={0}
                  max={5}
                  step={0.5}
                  onValueChange={(vals) => props.setPersonalMinRating(vals[0])}
                  className="py-4"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Contact Minimum Rating</label>
                  <span className="text-sm text-muted-foreground">{props.contactMinRating > 0 ? props.contactMinRating : 'Any'}</span>
                </div>
                <Slider
                  value={[props.contactMinRating]}
                  min={0}
                  max={5}
                  step={0.5}
                  onValueChange={(vals) => props.setContactMinRating(vals[0])}
                  className="py-4"
                />
              </div>
            </div>

            <Separator />

            {/* Social Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Social</h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Followed Contacts</label>
                  <p className="text-xs text-muted-foreground">Only show buildings from people I follow</p>
                </div>
                <Checkbox
                  checked={props.filterContacts}
                  onCheckedChange={(c) => props.setFilterContacts(!!c)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Specific People</label>
                <ContactPicker
                  selectedContacts={props.selectedContacts}
                  setSelectedContacts={props.setSelectedContacts}
                  placeholder="Filter by user..."
                />
              </div>
            </div>

            <Separator />

            {/* Characteristics Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Characteristics</h4>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={props.selectedCategory || "all"}
                  onValueChange={(val) => {
                    props.setSelectedCategory(val === "all" ? null : val);
                    // Reset typologies when category changes
                    if (val !== props.selectedCategory) {
                        props.setSelectedTypologies([]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Typologies</label>
                <MultiSelect
                  options={typologyOptions}
                  selected={props.selectedTypologies}
                  onChange={props.setSelectedTypologies}
                  placeholder="Select typologies..."
                  searchPlaceholder="Search typologies..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Attributes</label>
                <MultiSelect
                  options={attributeOptions}
                  selected={props.selectedAttributes}
                  onChange={props.setSelectedAttributes}
                  placeholder="Select attributes..."
                  searchPlaceholder="Search attributes..."
                />
              </div>
            </div>

            <Separator />

            {/* People & Collections */}
            <div className="space-y-4 pb-8">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Specifics</h4>

              <div className="space-y-2">
                <label className="text-sm font-medium">Architects</label>
                <ArchitectSelect
                  selectedArchitects={props.selectedArchitects}
                  setSelectedArchitects={props.setSelectedArchitects}
                  placeholder="Filter by architect..."
                />
              </div>

              {(props.availableCollections && props.availableCollections.length > 0) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">My Collections</label>
                  <MultiSelect
                    options={collectionOptions}
                    selected={props.selectedCollections.map(c => c.id)}
                    onChange={(ids) => {
                        const newCollections = ids.map(id => {
                            const found = props.availableCollections?.find(c => c.id === id);
                            return found ? { id: found.id, name: found.name } : null;
                        }).filter((c): c is { id: string; name: string } => c !== null);
                        props.setSelectedCollections(newCollections);
                    }}
                    placeholder="Select collections..."
                    searchPlaceholder="Search collections..."
                  />
                </div>
              )}
            </div>

          </div>
        </ScrollArea>

        <SheetFooter className="p-4 border-t mt-auto">
           <SheetClose asChild>
             <Button className="w-full">Show Results</Button>
           </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
