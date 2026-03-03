import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CollectionBuildingCard } from "./CollectionBuildingCard";
import { ItineraryBuilding } from "@/features/itinerary/stores/useItineraryStore";
import { CollectionItemWithBuilding, ItineraryStop } from "@/types/collection";
import { useItineraryStore } from "@/features/itinerary/stores/useItineraryStore";

interface SortableItineraryItemProps {
  stop: ItineraryStop;
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  badgeIndex: number;
}

export function SortableItineraryItem({
  stop,
  highlightedId,
  setHighlightedId,
  badgeIndex
}: SortableItineraryItemProps) {
  const buildingDetails = useItineraryStore((state) => state.buildingDetails);
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

  // Only handle building stops for now (or fallback if marker)
  // We construct a minimal compatible object since we don't have all data in the store currently
  const building = stop.type === 'building' ? buildingDetails[stop.referenceId] : null;

  if (!building) {
     return (
        <div ref={setNodeRef} style={style} className="mb-2 p-4 bg-muted border rounded" {...attributes} {...listeners}>
            Marker: {stop.referenceId}
        </div>
     );
  }

  const item: CollectionItemWithBuilding = {
    id: "temp-id",
    building_id: building.id,
    note: null,
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
        canEdit={false}
        onUpdateNote={() => {}}
        onNavigate={() => {}}
        isDraggable={true}
        dragHandleProps={{ ...attributes, ...listeners }}
        badgeIndex={badgeIndex}
      />
    </div>
  );
}
