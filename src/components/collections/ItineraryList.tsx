import { useState, useRef, Fragment } from "react";
import { AlertTriangle, Plus, Pencil, Car, Footprints, Bike, Bus } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { useItineraryStore, ItineraryBuilding } from "@/features/itinerary/stores/useItineraryStore";
import { SortableItineraryItem } from "./SortableItineraryItem";
import { CollectionBuildingCard } from "./CollectionBuildingCard";
import { CollectionMarkerCard } from "./CollectionMarkerCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDroppable } from "@dnd-kit/core";
import { CollectionItemWithBuilding } from "@/types/collection";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// --- Helper Components ---

import { ItineraryStop } from "@/types/collection";

interface AddStopPopoverProps {
  dayIndex: number; // 0-based index for the store
}

function AddStopPopover({ dayIndex }: AddStopPopoverProps) {
  const [open, setOpen] = useState(false);
  const buildingDetails = useItineraryStore((state) => state.buildingDetails);
  const markerDetails = useItineraryStore((state) => state.markerDetails);
  const reorderStops = useItineraryStore((state) => state.reorderStops);
  const days = useItineraryStore((state) => state.days);
  const calculateRouteForDay = useItineraryStore((state) => state.calculateRouteForDay);

  const availableBuildings = Object.values(buildingDetails);
  const availableMarkers = Object.values(markerDetails);

  const handleSelect = (type: 'building' | 'marker', referenceId: string) => {
    const dayStops = days[dayIndex]?.stops || [];

    const newStop: ItineraryStop = {
      id: crypto.randomUUID(),
      referenceId,
      type
    };

    const newStops = [...dayStops, newStop];
    reorderStops(dayIndex, newStops);
    calculateRouteForDay(dayIndex);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground mt-2 border border-transparent hover:border-border border-dashed">
          <Plus className="mr-2 h-4 w-4" /> Add Stop
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search saved places..." />
          <CommandList>
            <CommandEmpty>No places found.</CommandEmpty>

            {availableBuildings.length > 0 && (
              <CommandGroup heading="Buildings">
                {availableBuildings.map((building) => (
                  <CommandItem
                    key={`b-${building.id}`}
                    value={`building-${building.id}-${building.name}`}
                    onSelect={() => handleSelect('building', building.id)}
                  >
                    <span>{building.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {availableMarkers.length > 0 && (
              <CommandGroup heading="Map Pins">
                {availableMarkers.map((marker) => (
                  <CommandItem
                    key={`m-${marker.id}`}
                    value={`marker-${marker.id}-${marker.name}`}
                    onSelect={() => handleSelect('marker', marker.id)}
                  >
                    <span>{marker.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface ItinerarySegmentProps {
  stopId: string;
  dayIndex: number;
  transitToNext?: ItineraryStop['transitToNext'];
  defaultTransportMode: string;
}

function ItinerarySegment({ stopId, dayIndex, transitToNext, defaultTransportMode }: ItinerarySegmentProps) {
  const currentMode = transitToNext?.mode || defaultTransportMode;
  const updateSegmentTransit = useItineraryStore((state) => state.updateSegmentTransit);

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<string>(currentMode);
  const [instructions, setInstructions] = useState<string>(transitToNext?.customInstructions || "");

  // Update local state when popover opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setMode(transitToNext?.mode || defaultTransportMode);
      setInstructions(transitToNext?.customInstructions || "");
    }
    setIsOpen(open);
  };

  const handleSave = () => {
    updateSegmentTransit(dayIndex, stopId, {
      mode: mode as 'walking' | 'driving' | 'cycling' | 'transit',
      customInstructions: instructions.trim() || null,
      estimatedMinutes: transitToNext?.estimatedMinutes || null
    });
    setIsOpen(false);
  };

  let Icon = Footprints;
  if (currentMode === "driving") Icon = Car;
  else if (currentMode === "cycling") Icon = Bike;
  else if (currentMode === "transit") Icon = Bus;

  return (
    <div className="relative flex items-center justify-center h-6 my-1 group">
      {/* The subtle vertical line */}
      <div className="absolute top-0 bottom-0 w-px bg-border group-hover:bg-primary/50 transition-colors" />

      {/* The interactive pill containing the icon, visible on hover */}
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-full p-1 shadow-sm hover:bg-muted cursor-pointer">
            <Icon className="w-3 h-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="right" align="center">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Segment Options</h4>
              <p className="text-sm text-muted-foreground">
                Override default transport and add notes.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mode">Transport Mode</Label>
              <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v)} className="justify-start">
                <ToggleGroupItem value="walking" aria-label="Walking">
                  <Footprints className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="driving" aria-label="Driving">
                  <Car className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="transit" aria-label="Transit">
                  <Bus className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="cycling" aria-label="Cycling">
                  <Bike className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instructions">Custom Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="e.g., Take the north exit to avoid the crowd"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              Save changes
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ItineraryDayColumnProps {
  dayNumber: number;
  stops: ItineraryStop[];
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  distance?: number;
  transportMode: string;
  title?: string;
  description?: string;
  canEdit?: boolean;
  onUpdateNote?: (itemId: string, note: string) => void;
}

function ItineraryDayColumn({ dayNumber, stops, highlightedId, setHighlightedId, distance, transportMode, title, description, canEdit, onUpdateNote }: ItineraryDayColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `day-${dayNumber}`,
    data: { dayNumber }
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title || "");
  const [editedDescription, setEditedDescription] = useState(description || "");
  const updateDayContext = useItineraryStore(state => state.updateDayContext);

  const handleOpenEditDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedTitle(title || "");
    setEditedDescription(description || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveContext = () => {
    updateDayContext(dayNumber - 1, {
      title: editedTitle.trim() || undefined,
      description: editedDescription.trim() || undefined
    });
    setIsEditDialogOpen(false);
  };

  return (
    <AccordionItem value={`day-${dayNumber}`} className="border-b-0 mb-4 bg-muted/30 rounded-lg overflow-hidden border relative group">
        <div className="absolute top-2 right-4 z-10">
            <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 bg-muted/50 hover:bg-muted/80"
                onClick={handleOpenEditDialog}
            >
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Edit Day</span>
            </Button>
        </div>
        <AccordionTrigger className="px-4 py-2 hover:no-underline bg-muted/50 hover:bg-muted/80 transition-colors">
            <div className="flex flex-col w-full items-start text-left pr-10">
                <div className="flex items-center w-full justify-between">
                    <div className="flex items-center">
                        <span className="font-semibold">Day {dayNumber}{title ? `: ${title}` : ''}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-normal">
                            {stops.length} stop{stops.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                {transportMode === 'walking' && distance && distance > 15000 && (
                    <div className="text-amber-600 text-xs flex items-center font-normal mt-1">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Día muy intenso. Considera añadir un día extra o cambiar a coche.
                    </div>
                )}
            </div>
        </AccordionTrigger>
        <AccordionContent className="p-0">
             {description && (
                <div className="px-4 py-3 bg-muted/20 border-b text-sm text-muted-foreground">
                    {description}
                </div>
             )}
             <div ref={setNodeRef} className="p-2 min-h-[50px] space-y-2">
                <SortableContext
                    items={stops.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {stops.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-xs text-center text-muted-foreground py-4 border-2 border-dashed rounded-md px-4">
                            <span className="mb-2">Drag places here</span>
                            <AddStopPopover dayIndex={dayNumber - 1} />
                        </div>
                    )}
                    {stops.map((stop, index) => (
                        <Fragment key={stop.id}>
                            <SortableItineraryItem
                                stop={stop} // Need to refactor SortableItineraryItem next
                                highlightedId={highlightedId}
                                setHighlightedId={setHighlightedId}
                                badgeIndex={index + 1}
                                canEdit={canEdit}
                                onUpdateNote={onUpdateNote}
                            />
                            {index < stops.length - 1 && (
                                <ItinerarySegment
                                  stopId={stop.id}
                                  dayIndex={dayNumber - 1}
                                  transitToNext={stop.transitToNext}
                                  defaultTransportMode={transportMode}
                                />
                            )}
                        </Fragment>
                    ))}
                </SortableContext>
                {stops.length > 0 && (
                    <AddStopPopover dayIndex={dayNumber - 1} />
                )}
             </div>
        </AccordionContent>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Day {dayNumber}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor={`day-title-${dayNumber}`}>Title</Label>
                <Input
                  id={`day-title-${dayNumber}`}
                  placeholder="e.g., Historic Center & Local Markets"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`day-description-${dayNumber}`}>Description</Label>
                <Textarea
                  id={`day-description-${dayNumber}`}
                  placeholder="Add some context or advice for this day..."
                  className="min-h-[100px]"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveContext}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </AccordionItem>
  );
}

// --- Main Component ---

interface ItineraryListProps {
    highlightedId: string | null;
    setHighlightedId: (id: string | null) => void;
    canEdit?: boolean;
    onUpdateNote?: (itemId: string, note: string) => void;
}

export function ItineraryList({ highlightedId, setHighlightedId, canEdit, onUpdateNote }: ItineraryListProps) {
    const days = useItineraryStore((state) => state.days);
    const transportMode = useItineraryStore((state) => state.transportMode);
    const reorderStops = useItineraryStore((state) => state.reorderStops);
    const moveStopToDay = useItineraryStore((state) => state.moveStopToDay);
    const calculateRouteForDay = useItineraryStore((state) => state.calculateRouteForDay);

    const [activeId, setActiveId] = useState<string | null>(null);
    const dragStartDayRef = useRef<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const findDayContainer = (id: string) => {
        if (id.startsWith('day-')) {
             return days.find(d => `day-${d.dayNumber}` === id);
        }
        return days.find(day => day.stops.some(s => s.id === id));
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        const container = findDayContainer(event.active.id as string);
        if (container) {
            dragStartDayRef.current = container.dayNumber;
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the containers
        const activeContainer = findDayContainer(activeId);
        const overContainer = findDayContainer(overId);

        if (
            !activeContainer ||
            !overContainer ||
            activeContainer === overContainer
        ) {
            return;
        }

        const activeDayIndex = days.findIndex(d => d.dayNumber === activeContainer.dayNumber);
        const overDayIndex = days.findIndex(d => d.dayNumber === overContainer.dayNumber);

        let overIndex;

        if (overId.startsWith('day-')) {
             overIndex = overContainer.stops.length;
        } else {
             const overItemIndex = overContainer.stops.findIndex(s => s.id === overId);

             // If moving down, we want to go after. If up, before.
             // But simpler logic:
             const isBelowOverItem =
               over &&
               active.rect.current.translated &&
               active.rect.current.translated.top > over.rect.top + over.rect.height;

             const modifier = isBelowOverItem ? 1 : 0;
             overIndex = overItemIndex >= 0 ? overItemIndex + modifier : overContainer.stops.length;
        }

        moveStopToDay(activeId, activeDayIndex, overDayIndex, overIndex);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const previousDayNumber = dragStartDayRef.current;
        setActiveId(null);
        dragStartDayRef.current = null;

        if (!over) return;

        const activeContainer = findDayContainer(active.id as string);
        const overContainer = findDayContainer(over.id as string);

        if (activeContainer && overContainer) {
            const activeDayIndex = days.findIndex(d => d.dayNumber === activeContainer.dayNumber);
            const overDayIndex = days.findIndex(d => d.dayNumber === overContainer.dayNumber);

            const activeIndex = activeContainer.stops.findIndex(s => s.id === active.id);
            const overIndex = over.id.toString().startsWith('day-')
                ? overContainer.stops.length
                : overContainer.stops.findIndex(s => s.id === over.id);

            if (activeDayIndex === overDayIndex) {
                 const movedFromDifferentDay = previousDayNumber !== activeContainer.dayNumber;

                 // Recalculate source if moved from different day
                 if (movedFromDifferentDay && previousDayNumber !== null) {
                      const sourceDayIndex = days.findIndex(d => d.dayNumber === previousDayNumber);
                      if (sourceDayIndex !== -1) {
                          calculateRouteForDay(sourceDayIndex);
                      }
                 }

                 const orderChanged = activeIndex !== overIndex;
                 if (orderChanged && activeIndex !== -1 && overIndex !== -1) {
                     const newOrder = arrayMove(activeContainer.stops, activeIndex, overIndex);
                     reorderStops(activeDayIndex, newOrder);
                 }

                 // Always recalculate destination if we moved days or reordered
                 if (movedFromDifferentDay || orderChanged) {
                     calculateRouteForDay(activeDayIndex);
                 }
            } else {
                // Trigger recalculation for destination day
                calculateRouteForDay(activeDayIndex);

                // Trigger recalculation for source day if different
                if (previousDayNumber !== null && previousDayNumber !== activeContainer.dayNumber) {
                     const previousDayIndex = days.findIndex(d => d.dayNumber === previousDayNumber);
                     if (previousDayIndex !== -1) {
                         calculateRouteForDay(previousDayIndex);
                     }
                }
            }
        }
    };

    const activeStop = activeId ? days.flatMap(d => d.stops).find(s => s.id === activeId) : null;
    const buildingDetails = useItineraryStore((state) => state.buildingDetails);
    const markerDetails = useItineraryStore((state) => state.markerDetails);

    let activeBuilding = null;
    let activeMarker = null;

    if (activeStop) {
        if (activeStop.type === 'building') {
            activeBuilding = buildingDetails[activeStop.referenceId];
        } else if (activeStop.type === 'marker') {
            activeMarker = markerDetails[activeStop.referenceId];
        }
    }

    // Construct active item for display
    const activeDisplayItem: CollectionItemWithBuilding | null = activeBuilding ? {
        id: activeBuilding.collection_item_id || "temp-overlay-id",
        building_id: activeBuilding.id,
        note: activeBuilding.note || null,
        custom_category_id: null,
        is_hidden: false,
        building: {
          id: activeBuilding.id,
          name: activeBuilding.name,
          location_lat: activeBuilding.location_lat,
          location_lng: activeBuilding.location_lng,
          city: activeBuilding.city || null,
          country: activeBuilding.country || null,
          year_completed: activeBuilding.year_completed || null,
          hero_image_url: activeBuilding.hero_image_url || null,
          community_preview_url: activeBuilding.community_preview_url || null,
          location_precision: activeBuilding.location_precision || "approximate",
          building_architects: activeBuilding.building_architects || [],
          slug: activeBuilding.slug || null,
          short_id: activeBuilding.short_id || null
        }
    } : null;

    const dayIds = days.map(d => `day-${d.dayNumber}`);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <Accordion type="multiple" defaultValue={dayIds} className="w-full">
                {days.map((day) => (
                    <ItineraryDayColumn
                        key={day.dayNumber}
                        dayNumber={day.dayNumber}
                        stops={day.stops}
                        highlightedId={highlightedId}
                        setHighlightedId={setHighlightedId}
                        distance={day.distance}
                        transportMode={transportMode}
                        title={day.title}
                        description={day.description}
                        canEdit={canEdit}
                        onUpdateNote={onUpdateNote}
                    />
                ))}
            </Accordion>

            <DragOverlay dropAnimation={dropAnimationConfig}>
                {activeDisplayItem ? (
                     <div className="opacity-90 rotate-2 cursor-grabbing">
                         <CollectionBuildingCard
                            item={activeDisplayItem}
                            isHighlighted={false}
                            setHighlightedId={() => {}}
                            canEdit={!!canEdit}
                            onUpdateNote={(note) => {
                                if (onUpdateNote && activeDisplayItem.id !== "temp-overlay-id") {
                                    onUpdateNote(activeDisplayItem.id, note);
                                }
                            }}
                            onNavigate={() => {}}
                            isDraggable={true}
                            badgeIndex={0}
                         />
                     </div>
                ) : activeMarker ? (
                     <div className="opacity-90 rotate-2 cursor-grabbing">
                         <CollectionMarkerCard
                            marker={activeMarker}
                            isHighlighted={false}
                            setHighlightedId={() => {}}
                            canEdit={false}
                            onNavigate={() => {}}
                            isDraggable={true}
                            badgeIndex={0}
                         />
                     </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};
