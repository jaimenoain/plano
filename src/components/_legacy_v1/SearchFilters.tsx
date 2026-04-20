import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { UserSearchResult } from "../hooks/useUserSearch";
import { FilterDrawerContent } from "@/components/common/FilterDrawerContent";

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

  // New Props
  resultCount: number;
  communityQuality: number;
  setCommunityQuality: (quality: number) => void;
}

export function SearchFilters(props: SearchFiltersProps) {
  const activeFiltersCount = [
    props.statusFilters.length > 0,
    props.hideVisited,
    props.hideSaved,
    !props.hideHidden,
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
    props.setCommunityQuality(0);
  };

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
      <SheetContent className="w-[300px] sm:w-[400px] p-0 flex flex-col h-full z-[100]">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <FilterDrawerContent
          showLocationInput={false}

          statusFilters={props.statusFilters}
          onStatusFiltersChange={props.setStatusFilters}

          hideVisited={props.hideVisited}
          onHideVisitedChange={props.setHideVisited}

          hideSaved={props.hideSaved}
          onHideSavedChange={props.setHideSaved}

          hideHidden={props.hideHidden}
          onHideHiddenChange={props.setHideHidden}

          hideWithoutImages={props.hideWithoutImages}
          onHideWithoutImagesChange={props.setHideWithoutImages}

          personalMinRating={props.personalMinRating}
          onPersonalMinRatingChange={props.setPersonalMinRating}

          contactMinRating={props.contactMinRating}
          onContactMinRatingChange={props.setContactMinRating}

          filterContacts={props.filterContacts}
          onFilterContactsChange={props.setFilterContacts}

          selectedContacts={props.selectedContacts}
          onSelectedContactsChange={props.setSelectedContacts}

          selectedCollections={props.selectedCollections}
          onCollectionsChange={props.setSelectedCollections}
          availableCollections={props.availableCollections}

          communityQuality={props.communityQuality}
          onCommunityQualityChange={props.setCommunityQuality}

          selectedArchitects={props.selectedArchitects}
          onArchitectsChange={props.setSelectedArchitects}

          selectedCategory={props.selectedCategory}
          onCategoryChange={props.setSelectedCategory}

          selectedTypologies={props.selectedTypologies}
          onTypologiesChange={props.setSelectedTypologies}

          selectedAttributes={props.selectedAttributes}
          onAttributesChange={props.setSelectedAttributes}

          onClearAll={handleClearFilters}
          resultCount={props.resultCount}
        />
      </SheetContent>
    </Sheet>
  );
}
