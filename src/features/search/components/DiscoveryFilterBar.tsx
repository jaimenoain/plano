import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/ui/LocationInput";
import { MapPin, ListFilter, Locate, Check, Trophy, Users, Search, Star, X, ChevronsUpDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ContactPicker } from "./ContactPicker";
import { useBuildingMetadata } from "@/hooks/useBuildingMetadata";
import { UserSearchResult } from "../hooks/useUserSearch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";

export type SearchScope = 'content' | 'users' | 'architects';

export interface DiscoveryFilterBarProps {
  // Search Props
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchScope?: SearchScope;
  
  // Location Props
  onLocationSelect: (address: string, countryCode: string, placeName?: string) => void;
  onUseLocation?: () => void;
  
  // Architect Props
  selectedArchitects?: string[];
  onArchitectsChange?: (architects: string[]) => void;
  availableArchitects?: string[];
  
  // Personal Props
  showVisited: boolean;
  onVisitedChange: (value: boolean) => void;
  showBucketList: boolean;
  onBucketListChange: (value: boolean) => void;
  personalMinRating: number;
  onPersonalMinRatingChange: (value: number) => void;
  
  // Contact Props
  filterContacts: boolean;
  onFilterContactsChange: (value: boolean) => void;
  contactMinRating: number;
  onContactMinRatingChange: (value: number) => void;
  selectedContacts: UserSearchResult[];
  onSelectedContactsChange: (contacts: UserSearchResult[]) => void;

  // Characteristics Props
  selectedCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  selectedTypologies: string[];
  onTypologiesChange: (values: string[]) => void;
  selectedAttributes: string[];
  onAttributesChange: (values: string[]) => void;

  // Sort/Misc
  sortBy: 'distance' | 'relevance';
  onSortChange: (sort: 'distance' | 'relevance') => void;
  onShowLeaderboard?: () => void;
}

export function DiscoveryFilterBar(props: DiscoveryFilterBarProps) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [architectOpen, setArchitectOpen] = useState(false);

  const { categories, typologies, attributeGroups, attributes, isLoading: isMetadataLoading } = useBuildingMetadata();

  const hasActiveFilters =
    props.showVisited ||
    props.showBucketList ||
    props.filterContacts ||
    (props.selectedContacts && props.selectedContacts.length > 0) ||
    (props.selectedArchitects && props.selectedArchitects.length > 0) ||
    props.personalMinRating > 0 ||
    props.contactMinRating > 0 ||
    !!props.selectedCategory ||
    props.selectedTypologies.length > 0 ||
    props.selectedAttributes.length > 0;

  // Helper for Attribute Group filtering
  const handleAttributeGroupChange = (groupId: string, newGroupSelection: string[]) => {
      // Find all attributes belonging to this group
      const groupAttributeIds = attributes
        ?.filter((attr) => attr.group_id === groupId)
        .map((attr) => attr.id) || [];

      // Filter out any attributes from this group from the current selection
      const otherAttributes = props.selectedAttributes.filter(
        (id) => !groupAttributeIds.includes(id)
      );

      // Combine other attributes with the new selection for this group
      props.onAttributesChange([...otherAttributes, ...newGroupSelection]);
  };

  return (
    <div className="flex items-center p-4 border-b bg-background sticky top-0 z-20 gap-2">
       {/* Search Input */}
       <div className="flex-1 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
              placeholder={
                  props.searchScope === 'users' ? "Search people..." :
                  props.searchScope === 'architects' ? "Search architects..." :
                  "Search buildings, architects..."
              }
              className="pl-8"
              value={props.searchQuery}
              onChange={(e) => props.onSearchChange(e.target.value)}
          />
       </div>

       {/* Button 1: Pin Icon -> Location Dialog */}
       <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
               <MapPin className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-[20%] translate-y-0 gap-4">
             <DialogHeader>
                <DialogTitle>Search Location</DialogTitle>
             </DialogHeader>
             <div className="flex flex-col gap-4">
                 <LocationInput
                    value={locationQuery}
                    onLocationSelected={(address, country, place) => {
                         setLocationQuery(address);
                         props.onLocationSelect(address, country, place);

                         if (country || place) {
                             setLocationDialogOpen(false);
                         }
                    }}
                    placeholder="City, Region or Country..."
                    searchTypes={["(regions)"]}
                    className="w-full"
                 />
                 <Button variant="outline" onClick={() => { props.onUseLocation?.(); setLocationDialogOpen(false); }}>
                     <Locate className="mr-2 h-4 w-4" /> Use My Current Location
                 </Button>
             </div>
          </DialogContent>
       </Dialog>

       {/* Button 2: Filter Icon -> Filter Sheet */}
       <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
             <Button variant="outline" size="icon" className="h-10 w-10 relative">
                <ListFilter className="h-4 w-4" />
                {hasActiveFilters && (
                     <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                )}
             </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 flex flex-col h-full">
              <SheetHeader className="p-6 pb-2">
                 <SheetTitle>Filters</SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                 <div className="flex flex-col gap-6 py-4">

                     {/* PERSONAL SECTION */}
                     <div className="space-y-3">
                         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal</h3>
                         <div className="flex flex-col gap-2">
                             <Button variant={props.showVisited ? "secondary" : "outline"} onClick={() => props.onVisitedChange(!props.showVisited)} className="justify-start h-9 text-sm">
                                 {props.showVisited && <Check className="mr-2 h-4 w-4" />} Visited
                             </Button>
                             <Button variant={props.showBucketList ? "secondary" : "outline"} onClick={() => props.onBucketListChange(!props.showBucketList)} className="justify-start h-9 text-sm">
                                 {props.showBucketList && <Check className="mr-2 h-4 w-4" />} Bucket List
                             </Button>

                             <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" /> Min Rating
                                    </label>
                                    <span className="text-xs font-medium text-muted-foreground">{props.personalMinRating > 0 ? `${props.personalMinRating} Stars` : "Any"}</span>
                                </div>
                                <Slider
                                    value={[props.personalMinRating]}
                                    onValueChange={(val) => props.onPersonalMinRatingChange(val[0])}
                                    min={0}
                                    max={5}
                                    step={1}
                                    className="w-full"
                                />
                             </div>
                         </div>
                     </div>

                     <Separator />

                     {/* CONTACTS SECTION */}
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
                                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" /> Min Rating
                                    </label>
                                    <span className="text-xs font-medium text-muted-foreground">{props.contactMinRating > 0 ? `${props.contactMinRating} Stars` : "Any"}</span>
                                </div>
                                <Slider
                                    value={[props.contactMinRating]}
                                    onValueChange={(val) => props.onContactMinRatingChange(val[0])}
                                    min={0}
                                    max={5}
                                    step={1}
                                    className="w-full"
                                />
                             </div>
                         </div>
                     </div>

                     <Separator />

                     {/* ARCHITECTS SECTION */}
                     <div className="space-y-3">
                         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Architects</h3>

                         {(!props.searchScope || props.searchScope === 'content') && props.onArchitectsChange && props.availableArchitects && (
                            <div className="space-y-2">
                                {/* Selected Architects (Badges) */}
                                {props.selectedArchitects && props.selectedArchitects.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {props.selectedArchitects.map(arch => (
                                            <Badge key={arch} variant="secondary" className="flex items-center gap-1">
                                                {arch}
                                                <X
                                                    className="h-3 w-3 cursor-pointer"
                                                    onClick={() => {
                                                        const newArchitects = props.selectedArchitects!.filter(a => a !== arch);
                                                        props.onArchitectsChange?.(newArchitects);
                                                    }}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <Popover open={architectOpen} onOpenChange={setArchitectOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={architectOpen}
                                            className="w-full justify-between h-9 text-sm"
                                        >
                                            Search architects...
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search architect..." />
                                            <CommandList>
                                                <CommandEmpty>No architect found.</CommandEmpty>
                                                <CommandGroup>
                                                    {props.availableArchitects.map((arch) => (
                                                        <CommandItem
                                                            key={arch}
                                                            value={arch}
                                                            onSelect={(currentValue) => {
                                                                const current = props.selectedArchitects || [];
                                                                // Prevent duplicates
                                                                if (!current.includes(arch)) {
                                                                    props.onArchitectsChange?.([...current, arch]);
                                                                }
                                                                setArchitectOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    props.selectedArchitects?.includes(arch) ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {arch}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
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
                     <div className="pt-2">
                         <Button variant="ghost" className="w-full justify-start h-9" onClick={props.onShowLeaderboard}>
                             <Trophy className="mr-2 h-4 w-4 text-amber-500" /> Leaderboard
                         </Button>
                     </div>
                 </div>
              </div>
          </SheetContent>
       </Sheet>
    </div>
  );
}
