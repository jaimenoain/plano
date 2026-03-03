import { forwardRef } from "react";
import { CollectionMarker } from "@/types/collection";
import { cn } from "@/lib/utils";
import { Check, MapPin, Bed, Utensils, Bus, Camera, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CollectionMarkerCardProps {
  marker: CollectionMarker;
  isHighlighted: boolean;
  setHighlightedId: (id: string | null) => void;
  canEdit: boolean;
  onRemove?: () => void;
  onNavigate: () => void;
  isDraggable?: boolean;
  dragHandleProps?: any;
  badgeIndex?: number;
}

export const CollectionMarkerCard = forwardRef<HTMLDivElement, CollectionMarkerCardProps>(
  ({ marker, isHighlighted, setHighlightedId, canEdit, onRemove, onNavigate, isDraggable, dragHandleProps, badgeIndex }, ref) => {

    let Icon = MapPin;
    switch (marker.category) {
        case 'accommodation': Icon = Bed; break;
        case 'dining': Icon = Utensils; break;
        case 'transport': Icon = Bus; break;
        case 'attraction': Icon = Camera; break;
        case 'other': Icon = MapPin; break;
    }

    return (
        <Card
            ref={ref}
            className={cn(
                "group relative overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md",
                isHighlighted ? "border-primary ring-1 ring-primary bg-secondary/5" : "hover:border-primary/50"
            )}
            onMouseEnter={() => setHighlightedId(marker.id)}
            onMouseLeave={() => setHighlightedId(null)}
            onClick={() => {
                setHighlightedId(marker.id);
                onNavigate();
            }}
        >
            {canEdit && onRemove && (
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6 rounded-full shadow-sm bg-green-500 hover:bg-green-600 text-white border-none"
                        onClick={onRemove}
                        title="Remove from map"
                    >
                        <Check className="h-3 w-3" />
                    </Button>
                </div>
            )}
            <div className="flex flex-row min-h-[3.5rem]">
                {/* Drag Handle */}
                {isDraggable && (
                    <div
                        className="flex items-center justify-center px-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-r"
                        {...dragHandleProps}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                )}

                {/* Content Section */}
                <div className="flex flex-1 items-start p-2 gap-3 min-w-0">
                    <div className="p-1.5 bg-secondary/50 rounded-full shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-start gap-2 min-w-0">
                            {badgeIndex !== undefined && (
                                <div className="flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm mt-0.5 shrink-0">
                                    {badgeIndex}
                                </div>
                            )}
                            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                                {marker.name}
                            </h3>
                        </div>

                        {marker.notes && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                            "{marker.notes}"
                        </div>
                    )}

                        {marker.address && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {marker.address}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
  }
);

CollectionMarkerCard.displayName = "CollectionMarkerCard";
