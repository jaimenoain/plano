import { useState, useEffect } from "react";
import { DiscoveryBuilding } from "@/features/search/components/types";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2, MapPin, Bed, Utensils, Bus, Camera } from "lucide-react";
import { Label } from "@/components/ui/label";

interface MarkerInfoCardProps {
  marker: DiscoveryBuilding;
  onUpdateNote?: (id: string, note: string) => void;
  onDelete?: (id: string) => void;
  onClose?: () => void;
}

export function MarkerInfoCard({
  marker,
  onUpdateNote,
  onDelete,
  onClose,
}: MarkerInfoCardProps) {
  const [note, setNote] = useState(marker.notes || "");
  const [isDirty, setIsDirty] = useState(false);

  // Sync note state if prop changes (e.g. if external update happens)
  useEffect(() => {
    setNote(marker.notes || "");
    setIsDirty(false);
  }, [marker.notes]);

  let Icon = MapPin;
  switch (marker.markerCategory) {
    case 'accommodation': Icon = Bed; break;
    case 'dining': Icon = Utensils; break;
    case 'transport': Icon = Bus; break;
    case 'attraction': Icon = Camera; break;
    case 'other': Icon = MapPin; break;
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    setIsDirty(true);
  };

  const handleSaveNote = () => {
    if (onUpdateNote) {
      onUpdateNote(marker.id, note);
      setIsDirty(false);
    }
  };

  const canEdit = !!onUpdateNote;

  return (
    <Card className="w-[320px] shadow-xl border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-secondary rounded-full shrink-0">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate pr-2" title={marker.name}>
                {marker.name}
            </h3>
            <span className="text-xs text-muted-foreground capitalize">
                {marker.markerCategory || 'Marker'}
            </span>
          </div>
        </div>
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-1 -mt-1 hover:bg-transparent text-muted-foreground hover:text-foreground"
            onClick={(e) => {
                e.stopPropagation();
                onClose?.();
            }}
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-3 pt-2 space-y-3">
        {marker.address && (
          <div className="text-xs text-muted-foreground">
            {marker.address}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="marker-notes" className="text-xs font-medium text-muted-foreground">
            Notes
          </Label>
          <Textarea
            id="marker-notes"
            value={note}
            onChange={handleNoteChange}
            placeholder={canEdit ? "Add notes..." : "No notes"}
            className="min-h-[80px] text-xs resize-none bg-background/50 focus:bg-background"
            disabled={!canEdit}
          />
          {canEdit && isDirty && (
            <Button
                size="sm"
                onClick={handleSaveNote}
                className="w-full h-7 text-xs"
            >
              Save Note
            </Button>
          )}
        </div>
      </CardContent>

      {onDelete && (
        <CardFooter className="p-2 pt-0 flex justify-end">
            <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(marker.id);
                }}
            >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}
