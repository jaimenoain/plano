import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/ui/LocationInput";
import { MapPin, ListFilter, Locate, Check, Trophy, Sparkles, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

export function DiscoveryFilterBar(props: DiscoveryFilterBarProps) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");

  const hasActiveFilters =
    props.showVisited ||
    props.showBucketList ||
    props.selectedStyles.length > 0 ||
    (props.selectedArchitects && props.selectedArchitects.length > 0) ||
    (props.selectedCity && props.selectedCity !== 'all');

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
                         setLocationDialogOpen(false);
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
                 {/* 1. City Filter */}
                 {(!props.searchScope || props.searchScope === 'content') && (
                     <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> City
                        </label>
                        <select
                            className="w-full p-2 border rounded-md bg-background"
                            value={props.selectedCity}
                            onChange={(e) => props.onCityChange(e.target.value)}
                        >
                            <option value="all">All Cities</option>
                            {props.availableCities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                     </div>
                 )}

                 {/* 3. Toggles */}
                 <div className="flex flex-col gap-2">
                     <Button variant={props.showVisited ? "secondary" : "outline"} onClick={() => props.onVisitedChange(!props.showVisited)} className="justify-start">
                         {props.showVisited && <Check className="mr-2 h-4 w-4" />} Visited
                     </Button>
                     <Button variant={props.showBucketList ? "secondary" : "outline"} onClick={() => props.onBucketListChange(!props.showBucketList)} className="justify-start">
                         {props.showBucketList && <Check className="mr-2 h-4 w-4" />} Bucket List
                     </Button>
                 </div>

                 <Separator />

                 {/* 4. Styles */}
                 {(!props.searchScope || props.searchScope === 'content') && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Styles
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {props.availableStyles.slice(0, 15).map(style => (
                                <Badge
                                    key={style}
                                    variant={props.selectedStyles.includes(style) ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => {
                                        const newStyles = props.selectedStyles.includes(style)
                                            ? props.selectedStyles.filter(s => s !== style)
                                            : [...props.selectedStyles, style];
                                        props.onStylesChange(newStyles);
                                    }}
                                >
                                    {style}
                                </Badge>
                            ))}
                        </div>
                    </div>
                 )}

                 {/* 5. Architects */}
                 {(!props.searchScope || props.searchScope === 'content') && props.onArchitectsChange && props.availableArchitects && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" /> Architects
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {props.availableArchitects.slice(0, 15).map(arch => (
                                <Badge
                                    key={arch}
                                    variant={props.selectedArchitects?.includes(arch) ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => {
                                        const current = props.selectedArchitects || [];
                                        const newArchitects = current.includes(arch)
                                            ? current.filter(a => a !== arch)
                                            : [...current, arch];
                                        props.onArchitectsChange?.(newArchitects);
                                    }}
                                >
                                    {arch}
                                </Badge>
                            ))}
                        </div>
                    </div>
                 )}

                 {/* 6. Tools */}
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
