import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, Fragment } from "react";
import { AlertTriangle, Plus, Pencil, Car, Footprints, Bike, Bus, Clock, } from "lucide-react";
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, defaultDropAnimationSideEffects, useDroppable, } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useItineraryStore } from "@/features/itinerary/stores/useItineraryStore";
import { SortableItineraryItem } from "./SortableItineraryItem";
import { CollectionBuildingCard } from "./CollectionBuildingCard";
import { CollectionMarkerCard } from "./CollectionMarkerCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseDuration, formatDuration } from "@/utils/duration";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
function AddStopPopover({ dayIndex, onUpdateItinerary }) {
    const [open, setOpen] = useState(false);
    const buildingDetails = useItineraryStore((state) => state.buildingDetails);
    const markerDetails = useItineraryStore((state) => state.markerDetails);
    const reorderStops = useItineraryStore((state) => state.reorderStops);
    const days = useItineraryStore((state) => state.days);
    const calculateRouteForDay = useItineraryStore((state) => state.calculateRouteForDay);
    const availableBuildings = Object.values(buildingDetails);
    const availableMarkers = Object.values(markerDetails);
    const handleSelect = (type, referenceId) => {
        const dayStops = days[dayIndex]?.stops || [];
        const newStop = {
            id: crypto.randomUUID(),
            referenceId,
            type
        };
        const newStops = [...dayStops, newStop];
        reorderStops(dayIndex, newStops);
        calculateRouteForDay(dayIndex);
        // Defer the save slightly so store state has updated from reorderStops
        setTimeout(() => {
            if (onUpdateItinerary) {
                onUpdateItinerary(useItineraryStore.getState().getStoreAsItinerary());
            }
        }, 0);
        setOpen(false);
    };
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: "sm", className: "w-full text-text-secondary hover:text-text-primary mt-2 border border-transparent hover:border-border-default border-dashed", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " Add Stop"] }) }), _jsx(PopoverContent, { className: "w-[300px] p-0", align: "start", children: _jsxs(Command, { children: [_jsx(CommandInput, { placeholder: "Search saved places..." }), _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: "No places found." }), availableBuildings.length > 0 && (_jsx(CommandGroup, { heading: "Buildings", children: availableBuildings.map((building) => (_jsx(CommandItem, { value: `building-${building.id}-${building.name}`, onSelect: () => handleSelect('building', building.id), children: _jsx("span", { children: building.name }) }, `b-${building.id}`))) })), availableMarkers.length > 0 && (_jsx(CommandGroup, { heading: "Map Pins", children: availableMarkers.map((marker) => (_jsx(CommandItem, { value: `marker-${marker.id}-${marker.name}`, onSelect: () => handleSelect('marker', marker.id), children: _jsx("span", { children: marker.name }) }, `m-${marker.id}`))) }))] })] }) })] }));
}
function ItinerarySegment({ stopId, dayIndex, transitToNext, defaultTransportMode, onUpdateItinerary, canEdit }) {
    const currentMode = transitToNext?.mode || defaultTransportMode;
    const updateSegmentTransit = useItineraryStore((state) => state.updateSegmentTransit);
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState(currentMode);
    const [instructions, setInstructions] = useState(transitToNext?.customInstructions || "");
    const [duration, setDuration] = useState(formatDuration(transitToNext?.estimatedMinutes));
    // Update local state when popover opens
    const handleOpenChange = (open) => {
        if (open) {
            setMode(transitToNext?.mode || defaultTransportMode);
            setInstructions(transitToNext?.customInstructions || "");
            setDuration(formatDuration(transitToNext?.estimatedMinutes));
        }
        setIsOpen(open);
    };
    const handleSave = () => {
        updateSegmentTransit(dayIndex, stopId, {
            mode: mode,
            customInstructions: instructions.trim() || null,
            estimatedMinutes: parseDuration(duration)
        });
        setTimeout(() => {
            if (onUpdateItinerary) {
                onUpdateItinerary(useItineraryStore.getState().getStoreAsItinerary());
            }
        }, 0);
        setIsOpen(false);
    };
    let Icon = Footprints;
    if (currentMode === "driving")
        Icon = Car;
    else if (currentMode === "cycling")
        Icon = Bike;
    else if (currentMode === "transit")
        Icon = Bus;
    if (!canEdit) {
        return (_jsxs("div", { className: "relative flex items-center justify-center h-6 my-1 group", children: [_jsx("div", { className: "absolute top-0 bottom-0 w-px bg-border group-hover:bg-brand-primary/50 transition-colors" }), _jsxs("div", { className: "relative z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity w-full px-4", children: [_jsx("div", { className: "flex-1 flex justify-end pr-2", children: transitToNext?.estimatedMinutes ? (_jsx("span", { className: "text-xs text-text-secondary whitespace-nowrap", children: formatDuration(transitToNext.estimatedMinutes) })) : null }), instructions || transitToNext?.estimatedMinutes ? (_jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("button", { className: "shrink-0 bg-surface-default border border-border-default rounded-full p-1 shadow-sm cursor-help", children: _jsx(Icon, { className: "w-3 h-3 text-brand-primary" }) }) }), _jsx(PopoverContent, { className: "w-80", side: "right", align: "center", children: _jsxs("div", { className: "space-y-2", children: [_jsxs("h4", { className: "font-medium leading-none flex items-center gap-2", children: [_jsx(Icon, { className: "w-4 h-4" }), " Transport Note"] }), transitToNext?.estimatedMinutes && (_jsxs("p", { className: "text-sm font-medium flex items-center gap-1.5 mt-1", children: [_jsx(Clock, { className: "w-3 h-3 text-text-secondary" }), formatDuration(transitToNext.estimatedMinutes)] })), instructions && _jsx("p", { className: "text-sm text-text-secondary whitespace-pre-wrap mt-2", children: instructions })] }) })] })) : (_jsx("div", { className: "shrink-0 bg-surface-default border border-border-default rounded-full p-1 shadow-sm", children: _jsx(Icon, { className: "w-3 h-3 text-text-secondary" }) })), _jsx("div", { className: "flex-1 flex justify-start pl-2 overflow-hidden", children: instructions ? (_jsx("span", { className: "text-xs text-text-secondary truncate", title: instructions, children: instructions })) : null })] })] }));
    }
    return (_jsxs("div", { className: "relative flex items-center justify-center h-6 my-1 group", children: [_jsx("div", { className: "absolute top-0 bottom-0 w-px bg-border group-hover:bg-brand-primary/50 transition-colors" }), _jsxs("div", { className: "relative z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity w-full px-4", children: [_jsx("div", { className: "flex-1 flex justify-end pr-2", children: transitToNext?.estimatedMinutes ? (_jsx("span", { className: "text-xs text-text-secondary whitespace-nowrap", children: formatDuration(transitToNext.estimatedMinutes) })) : null }), _jsxs(Popover, { open: isOpen, onOpenChange: handleOpenChange, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("button", { className: "shrink-0 bg-surface-default border border-border-default rounded-full p-1 shadow-sm hover:bg-surface-muted cursor-pointer", children: _jsx(Icon, { className: "w-3 h-3 text-text-secondary" }) }) }), _jsx(PopoverContent, { className: "w-80", side: "right", align: "center", children: _jsxs("div", { className: "grid gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "font-medium leading-none", children: "Segment Options" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Override default transport and add notes." })] }), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "mode", children: "Transport Mode" }), _jsxs(ToggleGroup, { type: "single", value: mode, onValueChange: (v) => v && setMode(v), className: "justify-start", children: [_jsx(ToggleGroupItem, { value: "walking", "aria-label": "Walking", children: _jsx(Footprints, { className: "h-4 w-4" }) }), _jsx(ToggleGroupItem, { value: "driving", "aria-label": "Driving", children: _jsx(Car, { className: "h-4 w-4" }) }), _jsx(ToggleGroupItem, { value: "transit", "aria-label": "Transit", children: _jsx(Bus, { className: "h-4 w-4" }) }), _jsx(ToggleGroupItem, { value: "cycling", "aria-label": "Cycling", children: _jsx(Bike, { className: "h-4 w-4" }) })] })] }), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "instructions", children: "Custom Instructions" }), _jsx(Textarea, { id: "instructions", placeholder: "e.g., Take the north exit to avoid the crowd", value: instructions, onChange: (e) => setInstructions(e.target.value), className: "resize-none", rows: 3 })] }), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "duration", children: "Estimated Duration" }), _jsx(Input, { id: "duration", placeholder: "e.g., 1h 20min", value: duration, onChange: (e) => setDuration(e.target.value) })] }), _jsx(Button, { onClick: handleSave, className: "w-full", children: "Save changes" })] }) })] }), _jsx("div", { className: "flex-1 flex justify-start pl-2 overflow-hidden", children: instructions ? (_jsx("span", { className: "text-xs text-text-secondary truncate", title: instructions, children: instructions })) : null })] })] }));
}
function ItineraryDayColumn({ dayNumber, stops, highlightedId, setHighlightedId, distance, transportMode, title, description, onUpdateItinerary, canEdit, onUpdateNote }) {
    const { setNodeRef } = useDroppable({
        id: `day-${dayNumber}`,
        data: { dayNumber }
    });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title || "");
    const [editedDescription, setEditedDescription] = useState(description || "");
    const updateDayContext = useItineraryStore(state => state.updateDayContext);
    const handleOpenEditDialog = (e) => {
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
        setTimeout(() => {
            if (onUpdateItinerary) {
                onUpdateItinerary(useItineraryStore.getState().getStoreAsItinerary());
            }
        }, 0);
        setIsEditDialogOpen(false);
    };
    return (_jsxs(AccordionItem, { value: `day-${dayNumber}`, className: "border-b-0 mb-4 bg-surface-muted/30 rounded-lg overflow-hidden border relative group", children: [canEdit && (_jsx("div", { className: "absolute top-2 right-4 z-10", children: _jsxs(Button, { variant: "ghost", size: "sm", className: "opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 bg-surface-muted/50 hover:bg-surface-muted/80", onClick: handleOpenEditDialog, children: [_jsx(Pencil, { className: "h-4 w-4 text-text-secondary" }), _jsx("span", { className: "sr-only", children: "Edit Day" })] }) })), _jsx(AccordionTrigger, { className: "px-4 py-2 hover:no-underline bg-surface-muted/50 hover:bg-surface-muted/80 transition-colors", children: _jsxs("div", { className: "flex flex-col w-full items-start text-left pr-10", children: [_jsx("div", { className: "flex items-center w-full justify-between", children: _jsxs("div", { className: "flex items-center", children: [_jsxs("span", { className: "font-semibold", children: ["Day ", dayNumber, title ? `: ${title}` : ''] }), _jsxs("span", { className: "text-xs text-text-secondary ml-2 font-normal", children: [stops.length, " stop", stops.length !== 1 ? 's' : ''] })] }) }), transportMode === 'walking' && distance && distance > 15000 && (_jsxs("div", { className: "text-amber-600 text-xs flex items-center font-normal mt-1", children: [_jsx(AlertTriangle, { className: "w-3 h-3 mr-1" }), "D\u00EDa muy intenso. Considera a\u00F1adir un d\u00EDa extra o cambiar a coche."] }))] }) }), _jsxs(AccordionContent, { className: "p-0", children: [description && (_jsx("div", { className: "px-4 py-3 bg-surface-muted/20 border-b text-sm text-text-secondary", children: description })), _jsxs("div", { ref: setNodeRef, className: "p-2 min-h-[50px] space-y-2", children: [_jsxs(SortableContext, { items: stops.map(s => s.id), strategy: verticalListSortingStrategy, children: [stops.length === 0 && canEdit && (_jsxs("div", { className: "flex flex-col items-center justify-center text-xs text-center text-text-secondary py-4 border-2 border-dashed rounded-md px-4", children: [_jsx("span", { className: "mb-2", children: "Drag places here" }), _jsx(AddStopPopover, { dayIndex: dayNumber - 1, onUpdateItinerary: onUpdateItinerary })] })), stops.map((stop, index) => (_jsxs(Fragment, { children: [_jsx(SortableItineraryItem, { stop: stop, highlightedId: highlightedId, setHighlightedId: setHighlightedId, badgeIndex: index + 1, canEdit: canEdit, onUpdateNote: onUpdateNote }), index < stops.length - 1 && (_jsx(ItinerarySegment, { stopId: stop.id, dayIndex: dayNumber - 1, transitToNext: stop.transitToNext, defaultTransportMode: transportMode, onUpdateItinerary: onUpdateItinerary, canEdit: canEdit }))] }, stop.id)))] }), canEdit && stops.length > 0 && (_jsx(AddStopPopover, { dayIndex: dayNumber - 1, onUpdateItinerary: onUpdateItinerary }))] })] }), _jsx(Dialog, { open: isEditDialogOpen, onOpenChange: setIsEditDialogOpen, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Edit Day ", dayNumber] }) }), _jsxs("div", { className: "grid gap-4 py-4", children: [_jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: `day-title-${dayNumber}`, children: "Title" }), _jsx(Input, { id: `day-title-${dayNumber}`, placeholder: "e.g., Historic Center & Local Markets", value: editedTitle, onChange: (e) => setEditedTitle(e.target.value) })] }), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: `day-description-${dayNumber}`, children: "Description" }), _jsx(Textarea, { id: `day-description-${dayNumber}`, placeholder: "Add some context or advice for this day...", className: "min-h-[100px]", value: editedDescription, onChange: (e) => setEditedDescription(e.target.value) })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setIsEditDialogOpen(false), children: "Cancel" }), _jsx(Button, { onClick: handleSaveContext, children: "Save Changes" })] })] }) })] }));
}
export function ItineraryList({ highlightedId, setHighlightedId, onUpdateItinerary, canEdit, onUpdateNote }) {
    const days = useItineraryStore((state) => state.days);
    const transportMode = useItineraryStore((state) => state.transportMode);
    const reorderStops = useItineraryStore((state) => state.reorderStops);
    const moveStopToDay = useItineraryStore((state) => state.moveStopToDay);
    const calculateRouteForDay = useItineraryStore((state) => state.calculateRouteForDay);
    const [activeId, setActiveId] = useState(null);
    const dragStartDayRef = useRef(null);
    const recentlyMovedToNewContainerRef = useRef(0);
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    }), useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
    }));
    const activeSensors = canEdit ? sensors : [];
    const findDayContainer = (id) => {
        if (id.startsWith('day-')) {
            return days.find(d => `day-${d.dayNumber}` === id);
        }
        return days.find(day => day.stops.some(s => s.id === id));
    };
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
        const container = findDayContainer(event.active.id);
        if (container) {
            dragStartDayRef.current = container.dayNumber;
        }
    };
    const handleDragOver = (event) => {
        // Prevent extremely rapid container switches (flickering/infinite loops causing Error 185)
        if (Date.now() - recentlyMovedToNewContainerRef.current < 100)
            return;
        const { active, over } = event;
        if (!over)
            return;
        const activeId = active.id;
        const overId = over.id;
        // Find the containers
        const activeContainer = findDayContainer(activeId);
        const overContainer = findDayContainer(overId);
        if (!activeContainer ||
            !overContainer ||
            activeContainer === overContainer) {
            return;
        }
        const activeDayIndex = days.findIndex(d => d.dayNumber === activeContainer.dayNumber);
        const overDayIndex = days.findIndex(d => d.dayNumber === overContainer.dayNumber);
        let overIndex;
        if (overId.startsWith('day-')) {
            overIndex = overContainer.stops.length;
        }
        else {
            const overItemIndex = overContainer.stops.findIndex(s => s.id === overId);
            // If moving down, we want to go after. If up, before.
            // But simpler logic:
            const isBelowOverItem = over &&
                active.rect.current.translated &&
                active.rect.current.translated.top > over.rect.top + over.rect.height;
            const modifier = isBelowOverItem ? 1 : 0;
            overIndex = overItemIndex >= 0 ? overItemIndex + modifier : overContainer.stops.length;
        }
        if (activeDayIndex !== overDayIndex) {
            recentlyMovedToNewContainerRef.current = Date.now();
        }
        moveStopToDay(activeId, activeDayIndex, overDayIndex, overIndex);
    };
    const handleDragEnd = (event) => {
        const { active, over } = event;
        const previousDayNumber = dragStartDayRef.current;
        setActiveId(null);
        dragStartDayRef.current = null;
        if (!over)
            return;
        const activeContainer = findDayContainer(active.id);
        const overContainer = findDayContainer(over.id);
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
            }
            else {
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
            setTimeout(() => {
                if (onUpdateItinerary) {
                    onUpdateItinerary(useItineraryStore.getState().getStoreAsItinerary());
                }
            }, 0);
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
        }
        else if (activeStop.type === 'marker') {
            activeMarker = markerDetails[activeStop.referenceId];
        }
    }
    // Construct active item for display
    const activeDisplayItem = activeBuilding ? {
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
    return (_jsxs(DndContext, { sensors: activeSensors, collisionDetection: closestCenter, onDragStart: handleDragStart, onDragOver: handleDragOver, onDragEnd: handleDragEnd, children: [_jsx(Accordion, { type: "multiple", defaultValue: dayIds, className: "w-full", children: days.map((day) => (_jsx(ItineraryDayColumn, { dayNumber: day.dayNumber, stops: day.stops, highlightedId: highlightedId, setHighlightedId: setHighlightedId, distance: day.distance, transportMode: transportMode, title: day.title, description: day.description, onUpdateItinerary: onUpdateItinerary, canEdit: canEdit, onUpdateNote: onUpdateNote }, day.dayNumber))) }), _jsx(DragOverlay, { dropAnimation: dropAnimationConfig, children: activeDisplayItem ? (_jsx("div", { className: "opacity-90 rotate-2 cursor-grabbing", children: _jsx(CollectionBuildingCard, { item: activeDisplayItem, isHighlighted: false, setHighlightedId: () => { }, canEdit: !!canEdit, onUpdateNote: (note) => {
                            if (onUpdateNote && activeDisplayItem.id !== "temp-overlay-id") {
                                onUpdateNote(activeDisplayItem.id, note);
                            }
                        }, onNavigate: () => { }, isDraggable: true, badgeIndex: 0 }) })) : activeMarker ? (_jsx("div", { className: "opacity-90 rotate-2 cursor-grabbing", children: _jsx(CollectionMarkerCard, { marker: activeMarker, isHighlighted: false, setHighlightedId: () => { }, canEdit: false, onNavigate: () => { }, isDraggable: true, badgeIndex: 0 }) })) : null })] }));
}
const dropAnimationConfig = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};
