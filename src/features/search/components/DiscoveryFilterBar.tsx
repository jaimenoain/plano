import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/ui/LocationInput";
import { Check, ChevronsUpDown, MapPin, Sparkles, Trophy, Locate, Users, Building2, ListFilter, XCircle } from "lucide-react";
import { DiscoverySearchInput } from "./DiscoverySearchInput";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export type SearchScope = 'content' | 'users' | 'architects';

export interface DiscoveryFilterBarProps {
  // Search Props
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchScope?: SearchScope;
  
  // Location Props
  onLocationSelect: (address: string, countryCode: string, placeName?: string) => void;
  onUseLocation?: () => void;
  selectedCity: string;
  onCityChange: (value: string) => void;
  availableCities: string[];
  
  // Style Props
  selectedStyles: string[];
  onStylesChange: (styles: string[]) => void;
  availableStyles: string[];

  // Architect Props
  selectedArchitects?: string[];
  onArchitectsChange?: (architects: string[]) => void;
  availableArchitects?: string[];
  
  // Toggle Props
  showVisited: boolean;
  onVisitedChange: (value: boolean) => void;
  showBucketList: boolean;
  onBucketListChange: (value: boolean) => void;
  
  // Sort/Misc
  sortBy: 'distance' | 'relevance';
  onSortChange: (sort: 'distance' | 'relevance') => void;
  onShowLeaderboard?: () => void;
}

export function DiscoveryFilterBar({
  searchQuery,
  onSearchChange,
  onLocationSelect,
  selectedCity,
  onCityChange,
  availableCities,
  selectedStyles,
  onStylesChange,
  availableStyles,
  selectedArchitects = [],
  onArchitectsChange,
  availableArchitects = [],
  sortBy,
  onSortChange,
  showVisited,
  onVisitedChange,
  showBucketList,
  onBucketListChange,
  onShowLeaderboard,
  onUseLocation,
  searchScope,
}: DiscoveryFilterBarProps) {
  const [locationQuery, setLocationQuery] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  return (
    <div className="bg-background border-b sticky top-0 z-10">
      {/* Desktop View */}
      <div className="hidden md:grid grid-cols-12 h-full w-full">
        {/* Left Side: Main Search */}
        <div className="col-span-5 lg:col-span-4 p-4 border-r flex items-center">
          <DiscoverySearchInput
            placeholder={
              searchScope === 'users' ? "Search people..." :
              searchScope === 'architects' ? "Search architects..." :
              "Search buildings, architects..."
            }
            value={searchQuery}
            onSearchChange={onSearchChange}
            onLocationSelect={() => {}}
            className="w-full"
          />
        </div>

        {/* Right Side: Location Search + Filters */}
        <div className="col-span-7 lg:col-span-8 p-4 flex items-center gap-4">
           {/* Filters Row */}
           <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
               {/* Location Filter (City) */}
               {(!searchScope || searchScope === 'content') && (
                 <>
                   <FilterDropdown
                      title="City"
                      options={availableCities}
                      selectedValues={selectedCity && selectedCity !== 'all' ? [selectedCity] : []}
                      onSelect={(val) => onCityChange(val === selectedCity ? 'all' : val)}
                      icon={<MapPin className="mr-2 h-4 w-4" />}
                      single
                   />

                   <Separator orientation="vertical" className="h-6" />
                 </>
               )}

               {/* Style Filter */}
               {(!searchScope || searchScope === 'content') && (
                   <FilterDropdown
                      title="Styles"
                      options={availableStyles}
                      selectedValues={selectedStyles}
                      onSelect={(val) => {
                          const newStyles = selectedStyles.includes(val)
                             ? selectedStyles.filter(s => s !== val)
                             : [...selectedStyles, val];
                          onStylesChange(newStyles);
                      }}
                      icon={<Sparkles className="mr-2 h-4 w-4" />}
                   />
               )}

               {/* Architect Filter */}
               {(!searchScope || searchScope === 'content') && onArchitectsChange && (
                   <FilterDropdown
                      title="Architects"
                      options={availableArchitects}
                      selectedValues={selectedArchitects}
                      onSelect={(val) => {
                          const newArchitects = selectedArchitects.includes(val)
                             ? selectedArchitects.filter(a => a !== val)
                             : [...selectedArchitects, val];
                          onArchitectsChange(newArchitects);
                      }}
                      icon={<Users className="mr-2 h-4 w-4" />}
                   />
               )}
           </div>

           <div className="flex items-center gap-2 ml-auto shrink-0">
             {/* Location Button */}
             <Button
                variant="outline"
                size="icon"
                onClick={onUseLocation}
                title="Use my location"
                className="shrink-0"
              >
                <Locate className="h-4 w-4" />
              </Button>

              {/* Visited Filter */}
              <Button
                variant={showVisited ? "secondary" : "outline"}
                onClick={() => onVisitedChange(!showVisited)}
                className="shrink-0"
              >
                {showVisited && <Check className="mr-2 h-4 w-4" />}
                Visited
              </Button>

              {/* Bucket List Filter */}
              <Button
                variant={showBucketList ? "secondary" : "outline"}
                onClick={() => onBucketListChange(!showBucketList)}
                className="shrink-0"
              >
                {showBucketList && <Check className="mr-2 h-4 w-4" />}
                Bucket List
              </Button>

               {/* Leaderboard Button */}
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={onShowLeaderboard}
                title="Leaderboards"
              >
                <Trophy className="h-4 w-4 text-amber-500" />
              </Button>
           </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="flex md:hidden flex-row items-center gap-2 p-2">
        <DiscoverySearchInput
          placeholder={
            searchScope === 'users' ? "Search people..." :
            searchScope === 'architects' ? "Search architects..." :
            "Search..."
          }
          value={searchQuery}
          onSearchChange={onSearchChange}
          onLocationSelect={() => {}}
          className="flex-1"
        />

        <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="Search Location">
              <MapPin className="h-5 w-5 text-muted-foreground" />
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
                  onLocationSelect(address, country, place);
                  setLocationDialogOpen(false);
                }}
                placeholder="City or Country..."
                searchTypes={["(regions)"]}
                className="w-full"
              />
              <Button
                variant="outline"
                onClick={() => {
                  onUseLocation?.();
                  setLocationDialogOpen(false);
                }}
                className="w-full justify-start"
              >
                <Locate className="mr-2 h-4 w-4" />
                Use My Current Location
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="Filters">
              <ListFilter className="h-5 w-5 text-muted-foreground" />
              {(showVisited || showBucketList || (selectedStyles.length > 0) || (selectedArchitects.length > 0)) && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[auto] max-h-[85vh] rounded-t-xl">
            <SheetHeader className="mb-4">
              <SheetTitle>Filters & Settings</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-6 pb-6">
              {/* Filters */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">Filter Buildings</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={showVisited ? "secondary" : "outline"}
                    onClick={() => onVisitedChange(!showVisited)}
                    className="justify-start"
                  >
                    {showVisited && <Check className="mr-2 h-4 w-4" />}
                    Visited
                  </Button>
                  <Button
                    variant={showBucketList ? "secondary" : "outline"}
                    onClick={() => onBucketListChange(!showBucketList)}
                    className="justify-start"
                  >
                    {showBucketList && <Check className="mr-2 h-4 w-4" />}
                    Bucket List
                  </Button>
                </div>
              </div>

              {/* Mobile Styles Filter */}
              <div className="space-y-2">
                 <h3 className="text-sm font-medium text-muted-foreground">Architectural Styles</h3>
                 <div className="flex flex-wrap gap-2">
                     {availableStyles.slice(0, 10).map(style => (
                         <Badge
                             key={style}
                             variant={selectedStyles.includes(style) ? "default" : "outline"}
                             className="cursor-pointer"
                             onClick={() => {
                                 const newStyles = selectedStyles.includes(style)
                                    ? selectedStyles.filter(s => s !== style)
                                    : [...selectedStyles, style];
                                 onStylesChange(newStyles);
                             }}
                         >
                             {style}
                         </Badge>
                     ))}
                 </div>
              </div>

               {/* Mobile Architects Filter */}
               {onArchitectsChange && (
                   <div className="space-y-2">
                     <h3 className="text-sm font-medium text-muted-foreground">Architects</h3>
                     <div className="flex flex-wrap gap-2">
                         {availableArchitects.slice(0, 10).map(arch => (
                             <Badge
                                 key={arch}
                                 variant={selectedArchitects.includes(arch) ? "default" : "outline"}
                                 className="cursor-pointer"
                                 onClick={() => {
                                     const newArchitects = selectedArchitects.includes(arch)
                                        ? selectedArchitects.filter(a => a !== arch)
                                        : [...selectedArchitects, arch];
                                     onArchitectsChange(newArchitects);
                                 }}
                             >
                                 {arch}
                             </Badge>
                         ))}
                     </div>
                  </div>
               )}

              {/* Tools */}
              <div className="flex flex-col gap-2">
                 <h3 className="text-sm font-medium text-muted-foreground">Tools</h3>
                 <Button
                  variant="outline"
                  onClick={() => {
                    onShowLeaderboard?.();
                    setMobileFilterOpen(false);
                  }}
                  className="justify-start w-full"
                >
                  <Trophy className="mr-2 h-4 w-4 text-amber-500" />
                  View Leaderboards
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

// --- Helper Component: Filter Dropdown ---
interface FilterDropdownProps {
    title: string;
    options: string[];
    selectedValues: string[];
    onSelect: (value: string) => void;
    icon?: React.ReactNode;
    single?: boolean;
}

function FilterDropdown({ title, options, selectedValues, onSelect, icon, single }: FilterDropdownProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                    {icon}
                    {title}
                    {selectedValues.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                {selectedValues.length}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {selectedValues.length > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {selectedValues.length} selected
                                    </Badge>
                                ) : (
                                    options
                                        .filter((option) => selectedValues.includes(option))
                                        .map((option) => (
                                            <Badge
                                                key={option}
                                                variant="secondary"
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {option}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Filter ${title}...`} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValues.includes(option);
                                return (
                                    <CommandItem
                                        key={option}
                                        onSelect={() => onSelect(option)}
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{option}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {selectedValues.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => {
                                            selectedValues.forEach(v => onSelect(v));
                                        }}
                                        className="justify-center text-center"
                                    >
                                        Clear filters
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
