import { useState, useRef } from "react";
import { AlertTriangle } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDroppable } from "@dnd-kit/core";
import { CollectionItemWithBuilding } from "@/types/collection";

// --- Helper Components ---

interface ItineraryDayColumnProps {
  dayNumber: number;
  buildings: ItineraryBuilding[];
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  distance?: number;
  transportMode: string;
}

function ItineraryDayColumn({ dayNumber, buildings, highlightedId, setHighlightedId, distance, transportMode }: ItineraryDayColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `day-${dayNumber}`,
    data: { dayNumber }
  });

  return (
    <AccordionItem value={`day-${dayNumber}`} className="border-b-0 mb-4 bg-muted/30 rounded-lg overflow-hidden border">
        <AccordionTrigger className="px-4 py-2 hover:no-underline bg-muted/50 hover:bg-muted/80 transition-colors">
            <div className="flex flex-col w-full items-start text-left">
                <div className="flex items-center w-full">
                    <span className="font-semibold">Day {dayNumber}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                        {buildings.length} stop{buildings.length !== 1 ? 's' : ''}
                    </span>
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
             <div ref={setNodeRef} className="p-2 min-h-[50px] space-y-2">
                <SortableContext
                    items={buildings.map(b => b.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {buildings.length === 0 && (
                        <div className="text-xs text-center text-muted-foreground py-4 border-2 border-dashed rounded-md">
                            Drag places here
                        </div>
                    )}
                    {buildings.map((building, index) => (
                        <SortableItineraryItem
                            key={building.id}
                            building={building}
                            highlightedId={highlightedId}
                            setHighlightedId={setHighlightedId}
                            badgeIndex={index + 1}
                        />
                    ))}
                </SortableContext>
             </div>
        </AccordionContent>
    </AccordionItem>
  );
}

// --- Main Component ---

interface ItineraryListProps {
    highlightedId: string | null;
    setHighlightedId: (id: string | null) => void;
}

export function ItineraryList({ highlightedId, setHighlightedId }: ItineraryListProps) {
    const days = useItineraryStore((state) => state.days);
    const transportMode = useItineraryStore((state) => state.transportMode);
    const reorderBuildings = useItineraryStore((state) => state.reorderBuildings);
    const moveBuildingToDay = useItineraryStore((state) => state.moveBuildingToDay);
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
        return days.find(day => day.buildings.some(b => b.id === id));
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
             overIndex = overContainer.buildings.length;
        } else {
             const overItemIndex = overContainer.buildings.findIndex(b => b.id === overId);

             // If moving down, we want to go after. If up, before.
             // But simpler logic:
             const isBelowOverItem =
               over &&
               active.rect.current.translated &&
               active.rect.current.translated.top > over.rect.top + over.rect.height;

             const modifier = isBelowOverItem ? 1 : 0;
             overIndex = overItemIndex >= 0 ? overItemIndex + modifier : overContainer.buildings.length;
        }

        moveBuildingToDay(activeId, activeDayIndex, overDayIndex, overIndex);
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

            const activeIndex = activeContainer.buildings.findIndex(b => b.id === active.id);
            const overIndex = over.id.toString().startsWith('day-')
                ? overContainer.buildings.length
                : overContainer.buildings.findIndex(b => b.id === over.id);

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
                     const newOrder = arrayMove(activeContainer.buildings, activeIndex, overIndex);
                     reorderBuildings(activeDayIndex, newOrder);
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

    const activeBuilding = activeId ? days.flatMap(d => d.buildings).find(b => b.id === activeId) : null;

    // Construct active item for display
    const activeDisplayItem: CollectionItemWithBuilding | null = activeBuilding ? {
        id: "temp-overlay-id",
        building_id: activeBuilding.id,
        note: null,
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
                        buildings={day.buildings}
                        highlightedId={highlightedId}
                        setHighlightedId={setHighlightedId}
                        distance={day.distance}
                        transportMode={transportMode}
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
                            canEdit={false}
                            onUpdateNote={() => {}}
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
