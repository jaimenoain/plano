import { forwardRef } from "react";
import { CollectionMarker } from "@/types/collection";
import { cn } from "@/lib/utils";
import { Check, MapPin, Bed, Utensils, Bus, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CollectionMarkerCardProps {
  marker: CollectionMarker;
  isHighlighted: boolean;
  setHighlightedId: (id: string | null) => void;
  canEdit: boolean;
  onRemove?: () => void;
  onNavigate: () => void;
}

export const CollectionMarkerCard = forwardRef<HTMLDivElement, CollectionMarkerCardProps>(
  ({ marker, isHighlighted, setHighlightedId, canEdit, onRemove, onNavigate }, ref) => {

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
            <div className="flex flex-row min-h-[5rem] items-start p-3 gap-3">
                <div className="p-2 bg-secondary/50 rounded-full shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                        {marker.name}
                    </h3>

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
        </Card>
    );
  }
);

CollectionMarkerCard.displayName = "CollectionMarkerCard";
