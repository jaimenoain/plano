import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/ui/LocationInput";
import { MapPin, ListFilter, Locate, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserSearchResult } from "../hooks/useUserSearch";
import { FilterDrawerContent } from "@/components/common/FilterDrawerContent";

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
  selectedArchitects?: { id: string; name: string }[];
  onArchitectsChange?: (architects: { id: string; name: string }[]) => void;

  // Collections Props (My Lists)
  selectedCollections?: { id: string; name: string }[];
  onCollectionsChange?: (collections: { id: string; name: string }[]) => void;
  availableCollections?: { id: string; name: string }[];
  
  // Personal Props (Updated)
  statusFilters: string[];
  onStatusFiltersChange: (value: string[]) => void;
  hideVisited: boolean;
  onHideVisitedChange: (value: boolean) => void;
  hideSaved: boolean;
  onHideSavedChange: (value: boolean) => void;

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
  onSearchFocus?: () => void;
}

export function DiscoveryFilterBar(props: DiscoveryFilterBarProps) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");

  const hasActiveFilters =
    (props.statusFilters && props.statusFilters.length > 0) ||
    props.hideVisited ||
    props.hideSaved ||
    props.filterContacts ||
    (props.selectedContacts && props.selectedContacts.length > 0) ||
    (props.selectedArchitects && props.selectedArchitects.length > 0) ||
    (props.selectedCollections && props.selectedCollections.length > 0) ||
    props.personalMinRating > 0 ||
    props.contactMinRating > 0 ||
    !!props.selectedCategory ||
    props.selectedTypologies.length > 0 ||
    props.selectedAttributes.length > 0;

  const handleClearAll = () => {
    props.onStatusFiltersChange([]);
    props.onHideVisitedChange(false);
    props.onHideSavedChange(false);
    props.onFilterContactsChange(false);
    props.onPersonalMinRatingChange(0);
    props.onContactMinRatingChange(0);
    if (props.onCollectionsChange) props.onCollectionsChange([]);
    if (props.onArchitectsChange) props.onArchitectsChange([]);
    props.onCategoryChange(null);
    props.onTypologiesChange([]);
    props.onAttributesChange([]);
    props.onSelectedContactsChange([]);
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
              onFocus={props.onSearchFocus}
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
              <SheetHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                 <SheetTitle>Filters</SheetTitle>
                 {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 px-2 text-muted-foreground hover:text-foreground">
                        Clear All
                    </Button>
                 )}
              </SheetHeader>

              <FilterDrawerContent
                statusFilters={props.statusFilters}
                onStatusFiltersChange={props.onStatusFiltersChange}
                hideVisited={props.hideVisited}
                onHideVisitedChange={props.onHideVisitedChange}
                hideSaved={props.hideSaved}
                onHideSavedChange={props.onHideSavedChange}
                personalMinRating={props.personalMinRating}
                onPersonalMinRatingChange={props.onPersonalMinRatingChange}
                selectedCollections={props.selectedCollections}
                onCollectionsChange={props.onCollectionsChange}
                availableCollections={props.availableCollections}
                filterContacts={props.filterContacts}
                onFilterContactsChange={props.onFilterContactsChange}
                contactMinRating={props.contactMinRating}
                onContactMinRatingChange={props.onContactMinRatingChange}
                selectedContacts={props.selectedContacts}
                onSelectedContactsChange={props.onSelectedContactsChange}
                selectedArchitects={props.selectedArchitects}
                onArchitectsChange={
                    (!props.searchScope || props.searchScope === 'content')
                    ? props.onArchitectsChange
                    : undefined
                }
                selectedCategory={props.selectedCategory}
                onCategoryChange={props.onCategoryChange}
                selectedTypologies={props.selectedTypologies}
                onTypologiesChange={props.onTypologiesChange}
                selectedAttributes={props.selectedAttributes}
                onAttributesChange={props.onAttributesChange}
                onShowLeaderboard={props.onShowLeaderboard}
                onClearAll={handleClearAll}
              />
          </SheetContent>
       </Sheet>
    </div>
  );
}
