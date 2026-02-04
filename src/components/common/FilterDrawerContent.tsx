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
import { useBuildingMetadata } from "@/hooks/useBuildingMetadata";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  // Community Quality
  communityQuality: number;
  onCommunityQualityChange: (value: number) => void;

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
  onClearAll?: () => void;

  // Footer
  resultCount?: number;
}

type Scope = 'discover' | 'library' | 'network';

const MotionButton = motion(Button);
const MotionBadge = motion(Badge);

export function FilterDrawerContent(props: FilterDrawerContentProps) {
  const [activeScope, setActiveScope] = useState<Scope>('discover');

  const { categories, attributes, attributeGroups } = useBuildingMetadata();

  // Helper logic for Attributes
  const getGroupId = (name: string) => attributeGroups.find(g => g.name.toLowerCase().includes(name.toLowerCase()))?.id;
  const materialityGroupId = getGroupId('material');
  const contextGroupId = getGroupId('context');

  const materialAttributes = attributes.filter(a => a.group_id === materialityGroupId);
  const contextAttributes = attributes.filter(a => a.group_id === contextGroupId);

  const handleAttributeToggle = (id: string) => {
    if (props.selectedAttributes.includes(id)) {
      props.onAttributesChange(props.selectedAttributes.filter(a => a !== id));
    } else {
      props.onAttributesChange([...props.selectedAttributes, id]);
    }
  };

  // Intervention Logic
  const interventionOptions = ["Obra Nueva", "Rehabilitación"];

  const handleInterventionChange = (value: string) => {
    if (!value) return;
    const category = categories.find(c => c.name.toLowerCase() === value.toLowerCase());
    if (category) {
      props.onCategoryChange(category.id);
    } else {
      console.warn(`Category ${value} not found`);
    }
  };

  // Determine current intervention value based on selectedCategory
  const currentIntervention = interventionOptions.find(opt => {
    const cat = categories.find(c => c.id === props.selectedCategory);
    return cat?.name.toLowerCase() === opt.toLowerCase();
  }) || "";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Shelf 1: Top Navigation */}
      <div className="px-6 pt-6 pb-4 flex-none">
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

      {/* Scrollable Area: Shelf 2 & Shelf 3 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Shelf 2: Dynamic Interaction */}
        <div className="px-6 pb-6 min-h-[150px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScope}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {activeScope === 'discover' && (
                <ShelfDiscover
                  hideSaved={props.hideSaved}
                  onHideSavedChange={props.onHideSavedChange}
                  communityQuality={props.communityQuality}
                  onCommunityQualityChange={props.onCommunityQualityChange}
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

            {/* Intervention Toggle */}
            <div className="mb-4">
              <ToggleGroup
                type="single"
                value={currentIntervention}
                onValueChange={handleInterventionChange}
                className="justify-start gap-2"
              >
                {interventionOptions.map((option) => (
                  <ToggleGroupItem
                    key={option}
                    value={option}
                    className="px-4 py-2 h-auto text-xs font-medium border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {option}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <Accordion type="multiple" className="w-full">
              <AccordionItem value="category">
                <AccordionTrigger className="text-sm py-3">Categoría</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2 pt-2 pb-4">
                    {categories.map((cat) => (
                      <MotionBadge
                        key={cat.id}
                        variant={props.selectedCategory === cat.id ? "default" : "outline"}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "cursor-pointer hover:bg-primary/20 transition-colors",
                          props.selectedCategory === cat.id ? "hover:bg-primary/90" : ""
                        )}
                        onClick={() => props.onCategoryChange(props.selectedCategory === cat.id ? null : cat.id)}
                      >
                        {cat.name}
                      </MotionBadge>
                    ))}
                    {categories.length === 0 && (
                      <span className="text-xs text-muted-foreground">No categories available</span>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="materiality">
                <AccordionTrigger className="text-sm py-3">Materialidad</AccordionTrigger>
                <AccordionContent>
                   <div className="flex flex-wrap gap-2 pt-2 pb-4">
                    {materialAttributes.map((attr) => (
                      <MotionBadge
                        key={attr.id}
                        variant={props.selectedAttributes.includes(attr.id) ? "default" : "outline"}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "cursor-pointer hover:bg-primary/20 transition-colors",
                          props.selectedAttributes.includes(attr.id) ? "hover:bg-primary/90" : ""
                        )}
                        onClick={() => handleAttributeToggle(attr.id)}
                      >
                        {attr.name}
                      </MotionBadge>
                    ))}
                    {materialAttributes.length === 0 && (
                      <span className="text-xs text-muted-foreground">No materials found</span>
                    )}
                   </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="context">
                <AccordionTrigger className="text-sm py-3">Contexto</AccordionTrigger>
                <AccordionContent>
                   <div className="flex flex-wrap gap-2 pt-2 pb-4">
                    {contextAttributes.map((attr) => (
                      <MotionBadge
                        key={attr.id}
                        variant={props.selectedAttributes.includes(attr.id) ? "default" : "outline"}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "cursor-pointer hover:bg-primary/20 transition-colors",
                          props.selectedAttributes.includes(attr.id) ? "hover:bg-primary/90" : ""
                        )}
                        onClick={() => handleAttributeToggle(attr.id)}
                      >
                        {attr.name}
                      </MotionBadge>
                    ))}
                    {contextAttributes.length === 0 && (
                      <span className="text-xs text-muted-foreground">No context attributes found</span>
                    )}
                   </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="p-6 border-t bg-background mt-auto flex-none">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={props.onClearAll}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
          <MotionButton
            className="flex-1"
            onClick={() => {}}
            whileTap={{ scale: 0.97 }}
          >
            Show {props.resultCount !== undefined ? props.resultCount : ''} Results
          </MotionButton>
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
