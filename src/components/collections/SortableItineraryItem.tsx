import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CollectionBuildingCard } from "./CollectionBuildingCard";
import { CollectionMarkerCard } from "./CollectionMarkerCard";
import { ItineraryBuilding } from "@/features/itinerary/stores/useItineraryStore";
import { CollectionItemWithBuilding, ItineraryStop } from "@/types/collection";
import { useItineraryStore } from "@/features/itinerary/stores/useItineraryStore";

interface SortableItineraryItemProps {
  stop: ItineraryStop;
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  badgeIndex: number;
  canEdit?: boolean;
  onUpdateNote?: (itemId: string, note: string) => void;
}

export function SortableItineraryItem({
  stop,
  highlightedId,
  setHighlightedId,
  badgeIndex,
  canEdit,
  onUpdateNote
}: SortableItineraryItemProps) {
  const buildingDetails = useItineraryStore((state) => state.buildingDetails);
  const markerDetails = useItineraryStore((state) => state.markerDetails);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
    position: 'relative' as const,
  };

  if (stop.type === 'marker') {
    const marker = markerDetails[stop.referenceId];
    if (!marker) return null;

    return (
      <div ref={setNodeRef} style={style} className="mb-2">
        <CollectionMarkerCard
          marker={marker}
          isHighlighted={highlightedId === marker.id}
          setHighlightedId={setHighlightedId}
          canEdit={false}
          onNavigate={() => {}}
          isDraggable={!!canEdit}
          dragHandleProps={canEdit ? { ...attributes, ...listeners } : undefined}
          badgeIndex={badgeIndex}
        />
      </div>
    );
  }

  // Handle building stops
  const building = buildingDetails[stop.referenceId];
  if (!building) return null;

  const item: CollectionItemWithBuilding = {
    id: building.collection_item_id || "temp-id",
    building_id: building.id,
    note: building.note || null,
    custom_category_id: null,
    is_hidden: false,
    building: {
      id: building.id,
      name: building.name,
      location_lat: building.location_lat,
      location_lng: building.location_lng,
      city: building.city || null,
      country: building.country || null,
      year_completed: building.year_completed || null,
      hero_image_url: building.hero_image_url || null,
      community_preview_url: building.community_preview_url || null,
      location_precision: building.location_precision || "approximate",
      building_architects: building.building_architects || [],
      slug: building.slug || null,
      short_id: building.short_id || null
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <CollectionBuildingCard
        item={item}
        isHighlighted={highlightedId === building.id}
        setHighlightedId={setHighlightedId}
        canEdit={!!canEdit}
        onUpdateNote={(note) => {
          if (onUpdateNote && building.collection_item_id) {
            onUpdateNote(building.collection_item_id, note);
            // Also update the store to immediately reflect locally
            useItineraryStore.setState((state) => ({
              buildingDetails: {
                ...state.buildingDetails,
                [building.id]: {
                  ...state.buildingDetails[building.id],
                  note: note
                }
              }
            }));
          }
        }}
        onNavigate={() => {}}
        isDraggable={!!canEdit}
        dragHandleProps={canEdit ? { ...attributes, ...listeners } : undefined}
        badgeIndex={badgeIndex}
      />
    </div>
  );
}
