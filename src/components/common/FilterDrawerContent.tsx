import { Button } from "@/components/ui/button";
import { Check, X, ChevronsUpDown, Circle, Loader2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ContactPicker } from "@/features/search/components/ContactPicker";
import { ArchitectSelect } from "@/features/search/components/ArchitectSelect";
import { useBuildingMetadata } from "@/hooks/useBuildingMetadata";
import { UserSearchResult } from "@/features/search/hooks/useUserSearch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { LocationInput } from "@/components/ui/LocationInput";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

// Define props based on what's used in the sheet content
export interface FilterDrawerContentProps {
  // Location (New)
  locationQuery?: string;
  onLocationSelect?: (address: string, countryCode: string, placeName?: string) => void;
  onUseLocation?: () => void;
  showLocationInput?: boolean;

  // Personal (Refactored)
  statusFilters: string[]; // ['saved', 'visited']
  onStatusFiltersChange: (value: string[]) => void;
  hideVisited: boolean;
  onHideVisitedChange: (value: boolean) => void;
  hideSaved: boolean;
  onHideSavedChange: (value: boolean) => void;
  hidePersonalFilters?: boolean;

  // Collections
  selectedCollections?: { id: string; name: string }[];
  onCollectionsChange?: (collections: { id: string; name: string }[]) => void;
  availableCollections?: { id: string; name: string }[];

  // Personal Rating
  personalMinRating: number;
  onPersonalMinRatingChange: (value: number) => void;

  // Contacts
  filterContacts: boolean;
  onFilterContactsChange: (value: boolean) => void;
  contactMinRating: number;
  onContactMinRatingChange: (value: number) => void;
  selectedContacts: UserSearchResult[];
  onSelectedContactsChange: (contacts: UserSearchResult[]) => void;

  // Architects
  selectedArchitects?: { id: string; name: string }[];
  onArchitectsChange?: (architects: { id: string; name: string }[]) => void;

  // Characteristics
  selectedCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  selectedTypologies: string[];
  onTypologiesChange: (values: string[]) => void;
  selectedAttributes: string[];
  onAttributesChange: (values: string[]) => void;

  // Tools
  onShowLeaderboard?: () => void;
  onClearAll?: () => void; // Added missing prop definition
}

export function FilterDrawerContent(props: FilterDrawerContentProps) {
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const { categories, typologies, attributeGroups, attributes, isLoading: isMetadataLoading } = useBuildingMetadata();

  // Helper for Attribute Group filtering
  const handleAttributeGroupChange = (groupId: string, newGroupSelection: string[]) => {
      const groupAttributeIds = attributes
        ?.filter((attr) => attr.group_id === groupId)
        .map((attr) => attr.id) || [];

      const otherAttributes = props.selectedAttributes.filter(
        (id) => !groupAttributeIds.includes(id)
      );

      props.onAttributesChange([...otherAttributes, ...newGroupSelection]);
  };

  return (
      <div className="flex-1 overflow-y-auto px-6 pb-6">
         <div className="flex flex-col gap-6 py-4">

             {/* Location Input (Optional) */}
             {props.showLocationInput && (
                 <div className="space-y-3">
                     <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</h3>
                     <div className="flex flex-col gap-2">
                        <LocationInput
                            value={props.locationQuery || ""}
                            onLocationSelected={props.onLocationSelect || (() => {})}
                            placeholder="City, Region or Country..."
                            searchTypes={["(regions)"]}
                            className="w-full"
                        />
                        {props.onUseLocation && (
                            <Button variant="outline" onClick={props.onUseLocation} className="w-full text-xs h-8">
                                Use My Current Location
                            </Button>
                        )}
                     </div>
                     <Separator />
                 </div>
             )}

             {/* PERSONAL SECTION: My Lists & Map Options */}
             {!props.hidePersonalFilters && (
                 <>
                     {/* MY LISTS (Inclusion) */}
                     <div className="space-y-3">
                         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Lists</h3>
                         <div className="flex flex-col gap-3">
                             <div className="pb-2">
                                 <ToggleGroup type="multiple" value={props.statusFilters} onValueChange={props.onStatusFiltersChange} className="justify-start gap-2">
                                    <ToggleGroupItem value="saved" variant="outline" className="h-8 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                                      Saved
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="visited" variant="outline" className="h-8 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                                      Visited
                                    </ToggleGroupItem>
                                 </ToggleGroup>
                             </div>

                             {/* My Collections */}
                             {props.onCollectionsChange && props.availableCollections && (
                                <div className="space-y-2 pt-3">
                                    <Label className="text-sm font-medium">My Collections</Label>

                                    {/* Selected Collections (Badges) */}
                                    {props.selectedCollections && props.selectedCollections.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {props.selectedCollections.map(collection => (
                                                <Badge key={collection.id} variant="secondary" className="flex items-center gap-1">
                                                    {collection.name}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer"
                                                        onClick={() => {
                                                            const newCollections = props.selectedCollections!.filter(c => c.id !== collection.id);
                                                            props.onCollectionsChange?.(newCollections);
                                                        }}
                                                    />
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    <Popover open={collectionsOpen} onOpenChange={setCollectionsOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={collectionsOpen}
                                                className="w-full justify-between h-9 text-sm"
                                            >
                                                Select collections...
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search collections..." />
                                                <CommandList>
                                                    <CommandEmpty>No collections found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {props.availableCollections.map((collection) => (
                                                            <CommandItem
                                                                key={collection.id}
                                                                value={collection.name}
                                                                onSelect={() => {
                                                                    const current = props.selectedCollections || [];
                                                                    if (!current.some(c => c.id === collection.id)) {
                                                                        props.onCollectionsChange?.([...current, collection]);
                                                                    }
                                                                    setCollectionsOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        props.selectedCollections?.some(c => c.id === collection.id) ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {collection.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                             )}

                             <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Circle className="h-3.5 w-3.5 fill-[#595959] text-[#595959]" /> Min Rating
                                    </label>
                                    <span className="text-xs font-medium text-muted-foreground">{props.personalMinRating > 0 ? `${props.personalMinRating} Circles` : "Any"}</span>
                                </div>
                                <Slider
                                    value={[props.personalMinRating]}
                                    onValueChange={(val) => props.onPersonalMinRatingChange(val[0])}
                                    min={0}
                                    max={3}
                                    step={1}
                                    className="w-full"
                                />
                             </div>
                         </div>
                     </div>
                     <Separator />

                     {/* MAP OPTIONS (Exclusion) */}
                     <div className="space-y-3">
                         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Map Options</h3>
                         <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="hide-visited" className="text-sm font-medium cursor-pointer">Hide Visited</Label>
                                <Switch id="hide-visited" checked={props.hideVisited} onCheckedChange={props.onHideVisitedChange} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="hide-saved" className="text-sm font-medium cursor-pointer">Hide Saved</Label>
                                <Switch id="hide-saved" checked={props.hideSaved} onCheckedChange={props.onHideSavedChange} />
                            </div>
                         </div>
                     </div>
                     <Separator />
                 </>
             )}

             {/* CONTACTS SECTION */}
             {!props.hidePersonalFilters && (
                 <>
                     <div className="space-y-3">
                         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacts</h3>
                         <div className="flex flex-col gap-2">
                             <Button variant={props.filterContacts ? "secondary" : "outline"} onClick={() => props.onFilterContactsChange(!props.filterContacts)} className="justify-start h-9 text-sm">
                                 {props.filterContacts && <Check className="mr-2 h-4 w-4" />} From Any Contact
                             </Button>

                             <div className="space-y-1">
                                <Label className="text-sm font-medium">Specific Contacts</Label>
                                <ContactPicker
                                    selectedContacts={props.selectedContacts}
                                    setSelectedContacts={props.onSelectedContactsChange}
                                    placeholder="Select contacts..."
                                />
                             </div>

                             <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Circle className="h-3.5 w-3.5 fill-[#595959] text-[#595959]" /> Min Rating
                                    </label>
                                    <span className="text-xs font-medium text-muted-foreground">{props.contactMinRating > 0 ? `${props.contactMinRating} Circles` : "Any"}</span>
                                </div>
                                <Slider
                                    value={[props.contactMinRating]}
                                    onValueChange={(val) => props.onContactMinRatingChange(val[0])}
                                    min={0}
                                    max={3}
                                    step={1}
                                    className="w-full"
                                />
                             </div>
                         </div>
                     </div>
                     <Separator />
                 </>
             )}

             {/* ARCHITECTS SECTION */}
             <div className="space-y-3">
                 <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Architects</h3>

                 {props.onArchitectsChange && (
                    <div className="space-y-2">
                        <ArchitectSelect
                            selectedArchitects={props.selectedArchitects || []}
                            setSelectedArchitects={props.onArchitectsChange}
                            placeholder="Search architects..."
                        />
                    </div>
                 )}
             </div>

             <Separator />

             {/* CHARACTERISTICS SECTION */}
             <div className="space-y-4">
                 <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Characteristics</h3>

                 {isMetadataLoading ? (
                     <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                 ) : (
                     <>
                         {/* Category */}
                         <div className="space-y-2">
                             <Label className="text-sm font-medium">Category</Label>
                             <Select
                                value={props.selectedCategory || "all"}
                                onValueChange={(val) => {
                                    if (val === "all") {
                                        props.onCategoryChange(null);
                                        props.onTypologiesChange([]);
                                    } else {
                                        props.onCategoryChange(val);
                                        props.onTypologiesChange([]); // Clear typologies on category change
                                    }
                                }}
                             >
                                <SelectTrigger className="w-full h-9">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                         </div>

                         {/* Typology */}
                         {props.selectedCategory && (
                             <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                 <Label className="text-sm font-medium">Typology</Label>
                                 <ToggleGroup type="multiple" variant="outline" value={props.selectedTypologies} onValueChange={props.onTypologiesChange} className="justify-start flex-wrap gap-2">
                                     {typologies
                                         .filter(t => t.parent_category_id === props.selectedCategory)
                                         .map(t => (
                                             <ToggleGroupItem key={t.id} value={t.id} className="h-7 text-xs px-2.5">
                                                 {t.name}
                                             </ToggleGroupItem>
                                         ))
                                     }
                                     {typologies.filter(t => t.parent_category_id === props.selectedCategory).length === 0 && (
                                         <span className="text-xs text-muted-foreground italic">No typologies available</span>
                                     )}
                                 </ToggleGroup>
                             </div>
                         )}

                         {/* Attributes */}
                         <div className="space-y-4 pt-2">
                             {attributeGroups.map(group => {
                                 const groupAttributes = attributes.filter(a => a.group_id === group.id);
                                 if (groupAttributes.length === 0) return null;

                                 return (
                                     <div key={group.id} className="space-y-2">
                                         <Label className="text-xs text-muted-foreground font-semibold uppercase">{group.name}</Label>
                                         <ToggleGroup
                                            type="multiple"
                                            variant="outline"
                                            value={props.selectedAttributes.filter(id => groupAttributes.some(a => a.id === id))}
                                            onValueChange={(newSelection) => handleAttributeGroupChange(group.id, newSelection)}
                                            className="justify-start flex-wrap gap-2"
                                         >
                                             {groupAttributes.map(attr => (
                                                 <ToggleGroupItem key={attr.id} value={attr.id} className="h-7 text-xs px-2.5">
                                                     {attr.name}
                                                 </ToggleGroupItem>
                                             ))}
                                         </ToggleGroup>
                                     </div>
                                 )
                             })}
                         </div>
                     </>
                 )}
             </div>

             <Separator />

             {/* Tools */}
             {props.onShowLeaderboard && (
                 <div className="pt-2">
                     <Button variant="ghost" className="w-full justify-start h-9" onClick={props.onShowLeaderboard}>
                         <Trophy className="mr-2 h-4 w-4 text-amber-500" /> Leaderboard
                     </Button>
                 </div>
             )}
         </div>
      </div>
  );
}
