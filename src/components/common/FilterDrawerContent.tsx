"use client"

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArchitectSelect } from "@/features/search/components/ArchitectSelect";
import { UserSearchResult } from "@/features/search/hooks/useUserSearch";
import { ShelfDiscover } from "./filters/ShelfDiscover";
import { ShelfLibrary } from "./filters/ShelfLibrary";

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
  hideHidden: boolean;
  onHideHiddenChange: (value: boolean) => void;
  hideWithoutImages?: boolean;
  onHideWithoutImagesChange?: (value: boolean) => void;
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

type Scope = 'discover' | 'library' | 'network';

export function FilterDrawerContent(props: FilterDrawerContentProps) {
  const [activeScope, setActiveScope] = useState<Scope>('discover');
  const [communityQuality, setCommunityQuality] = useState(0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Shelf 1: Top Navigation */}
      <div className="px-6 pt-6 pb-4">
        <SegmentedControl
          options={[
            { label: 'Descubrir', value: 'discover' },
            { label: 'Mi Biblioteca', value: 'library' },
            { label: 'Mi Red', value: 'network' },
          ]}
          value={activeScope}
          onValueChange={(val) => setActiveScope(val as Scope)}
          className="w-full"
        />
      </div>

      {/* Shelf 2: Dynamic Interaction */}
      <div className="flex-1 overflow-y-auto px-6 min-h-[150px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScope}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeScope === 'discover' && (
              <ShelfDiscover
                hideSaved={props.hideSaved}
                onHideSavedChange={props.onHideSavedChange}
                communityQuality={communityQuality}
                onCommunityQualityChange={setCommunityQuality}
              />
            )}
            {activeScope === 'library' && (
              <ShelfLibrary
                statusFilters={props.statusFilters}
                onStatusFiltersChange={props.onStatusFiltersChange}
                selectedCollections={props.selectedCollections}
                onCollectionsChange={props.onCollectionsChange}
                availableCollections={props.availableCollections}
                personalMinRating={props.personalMinRating}
                onPersonalMinRatingChange={props.onPersonalMinRatingChange}
              />
            )}
            {activeScope === 'network' && <ShelfNetwork />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Shelf 3: Global DNA */}
      <div className="border-t bg-muted/20">
        <div className="px-6 py-4">
          <div className="mb-4">
            <label className="text-sm font-medium mb-1.5 block">Arquitectos</label>
            <ArchitectSelect
              selectedArchitects={props.selectedArchitects || []}
              setSelectedArchitects={props.onArchitectsChange || (() => {})}
              placeholder="Buscar arquitectos..."
              className="w-full"
            />
          </div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Global Filters
          </h3>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="category">
              <AccordionTrigger className="text-sm py-3">Categoría</AccordionTrigger>
              <AccordionContent>
                <div className="text-sm text-muted-foreground p-2">Category filters placeholder</div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="materiality">
              <AccordionTrigger className="text-sm py-3">Materialidad</AccordionTrigger>
              <AccordionContent>
                 <div className="text-sm text-muted-foreground p-2">Materiality filters placeholder</div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="context">
              <AccordionTrigger className="text-sm py-3">Contexto</AccordionTrigger>
              <AccordionContent>
                 <div className="text-sm text-muted-foreground p-2">Context filters placeholder</div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}

function ShelfNetwork() {
  return (
    <div className="py-4 text-sm text-muted-foreground border-2 border-dashed border-muted rounded-lg p-4 flex items-center justify-center h-32">
      Controls for Network Mode
    </div>
  );
}
