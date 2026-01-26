import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/ui/LocationInput";
import { MapPin, ListFilter, Locate, Check, Trophy, Users, Search, Star, X, ChevronsUpDown } from "lucide-react";
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
  
  // Toggle Props
  showVisited: boolean;
  onVisitedChange: (value: boolean) => void;
  showBucketList: boolean;
  onBucketListChange: (value: boolean) => void;
  
  // NEW Props
  filterContacts: boolean;
  onFilterContactsChange: (value: boolean) => void;
  minRating: number;
  onMinRatingChange: (value: number) => void;

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

  const hasActiveFilters =
    props.showVisited ||
    props.showBucketList ||
    props.filterContacts ||
    (props.selectedArchitects && props.selectedArchitects.length > 0) ||
    props.minRating > 0;

  const showRating = props.showVisited || props.showBucketList || props.filterContacts;

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

                         // Only close if we have a definitive selection (country or place name)
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
          <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
              <SheetHeader>
                 <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 py-6">
                 {/* Toggles */}
                 <div className="flex flex-col gap-2">
                     <Button variant={props.showVisited ? "secondary" : "outline"} onClick={() => props.onVisitedChange(!props.showVisited)} className="justify-start">
                         {props.showVisited && <Check className="mr-2 h-4 w-4" />} Visited
                     </Button>
                     <Button variant={props.showBucketList ? "secondary" : "outline"} onClick={() => props.onBucketListChange(!props.showBucketList)} className="justify-start">
                         {props.showBucketList && <Check className="mr-2 h-4 w-4" />} Bucket List
                     </Button>
                     <Button variant={props.filterContacts ? "secondary" : "outline"} onClick={() => props.onFilterContactsChange(!props.filterContacts)} className="justify-start">
                         {props.filterContacts && <Check className="mr-2 h-4 w-4" />} From Contacts
                     </Button>
                 </div>

                 {/* Minimum Rating (Conditional) */}
                 {showRating && (
                     <div className="space-y-4 pt-2">
                         <div className="flex justify-between items-center">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Min Rating
                            </label>
                            <span className="text-sm font-medium">{props.minRating > 0 ? `${props.minRating} Stars` : "Any"}</span>
                         </div>
                         <Slider
                            value={[props.minRating]}
                            onValueChange={(val) => props.onMinRatingChange(val[0])}
                            min={0}
                            max={5}
                            step={1}
                            className="w-full"
                         />
                     </div>
                 )}

                 <Separator />

                 {/* Architects Search Box */}
                 {(!props.searchScope || props.searchScope === 'content') && props.onArchitectsChange && props.availableArchitects && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" /> Architects
                        </label>

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
                                    className="w-full justify-between"
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

                 {/* Tools */}
                 <div className="mt-auto pt-4 border-t">
                     <Button variant="ghost" className="w-full justify-start" onClick={props.onShowLeaderboard}>
                         <Trophy className="mr-2 h-4 w-4 text-amber-500" /> Leaderboard
                     </Button>
                 </div>
              </div>
          </SheetContent>
       </Sheet>
    </div>
  );
}
