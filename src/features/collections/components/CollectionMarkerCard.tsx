import { forwardRef, useEffect, useRef, useState, type FocusEvent } from "react";
import { CollectionMarker } from "@/features/collections/types";
import { cn } from "@/lib/utils";
import { Check, GripVertical, MessageSquarePlus, Save } from "lucide-react";
import { getCollectionMarkerLucideIcon } from "@/features/collections/markerPlaceDisplay";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CollectionMarkerCardProps {
  marker: CollectionMarker;
  isHighlighted: boolean;
  setHighlightedId: (id: string | null) => void;
  canEdit: boolean;
  onRemove?: () => void;
  onNavigate: () => void;
  isDraggable?: boolean;
  dragHandleProps?: Record<string, unknown>;
  badgeIndex?: number;
  /** When set with `canEdit`, shows Add note / edit note UI and persists via this callback. */
  onUpdateNote?: (note: string) => void;
}

export const CollectionMarkerCard = forwardRef<HTMLDivElement, CollectionMarkerCardProps>(
  ({ marker, isHighlighted, setHighlightedId, canEdit, onRemove, onNavigate, isDraggable, dragHandleProps, badgeIndex, onUpdateNote }, ref) => {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteValue, setNoteValue] = useState(marker.notes || "");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      setNoteValue(marker.notes || "");
    }, [marker.notes]);

    useEffect(() => {
      if (isEditingNote && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [isEditingNote]);

    const handleNoteBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      onUpdateNote?.(value);
      setIsEditingNote(false);
    };

    const Icon = getCollectionMarkerLucideIcon(marker.category, marker.google_primary_type);

    let displayAddress = marker.address;
    if (displayAddress && marker.name) {
        if (displayAddress.startsWith(`${marker.name}, `)) {
            displayAddress = displayAddress.substring(marker.name.length + 2);
        } else if (displayAddress.startsWith(`${marker.name},`)) {
            displayAddress = displayAddress.substring(marker.name.length + 1).trim();
        }
    }

    return (
        <Card
            ref={ref}
            className={cn(
                "group relative overflow-hidden transition-all duration-200 cursor-pointer bg-surface-card border border-border-default rounded-sm shadow-none",
                isHighlighted ? "border-brand-primary ring-1 ring-brand-primary bg-brand-secondary/50" : "hover:border-border-strong"
            )}
            onMouseEnter={() => setHighlightedId(marker.id)}
            onMouseLeave={() => setHighlightedId(null)}
            onClick={() => {
                setHighlightedId(marker.id);
                onNavigate();
            }}
        >
            {canEdit && onRemove && (
                <div
                    className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 rounded-sm shadow-none"
                        onClick={onRemove}
                        title="Remove from map"
                    >
                        <Check className="h-3 w-3" />
                    </Button>
                </div>
            )}
            <div className="flex flex-row min-h-14">
                {/* Drag Handle */}
                {isDraggable && (
                    <div
                        className="flex items-center justify-center px-2 cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary hover:bg-surface-muted/50 transition-colors border-r"
                        {...dragHandleProps}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                )}

                {/* Content Section */}
                <div className="flex flex-1 items-start p-2 gap-3 min-w-0">
                    <div className="p-1.5 bg-surface-muted/50 rounded-sm shrink-0">
                        <Icon className="w-4 h-4 text-text-secondary" />
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-start gap-2 min-w-0">
                            {badgeIndex !== undefined && (
                                <div className="flex items-center justify-center min-w-5 h-5 rounded-sm bg-brand-primary text-[10px] font-bold text-brand-primary-foreground mt-0.5 px-1 shrink-0">
                                    {badgeIndex}
                                </div>
                            )}
                            <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-text-primary">
                                {marker.name}
                            </h3>
                        </div>

                        {displayAddress && (
                            <div className="text-xs text-text-secondary mt-1 line-clamp-1">
                                {displayAddress}
                            </div>
                        )}

                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            {canEdit && onUpdateNote ? (
                                isEditingNote ? (
                                    <div className="relative group/note">
                                        <Textarea
                                            ref={textareaRef}
                                            placeholder="Add a note..."
                                            value={noteValue}
                                            onChange={(e) => setNoteValue(e.target.value)}
                                            onBlur={handleNoteBlur}
                                            className="resize-none text-xs min-h-[40px] bg-surface-muted/30 border-transparent focus:border-border-default focus:bg-surface-default transition-colors p-2"
                                            rows={3}
                                        />
                                        <div className="absolute bottom-1 right-1 opacity-50 pointer-events-none">
                                            <Save className="h-3 w-3" />
                                        </div>
                                    </div>
                                ) : noteValue ? (
                                    <div
                                        className="text-xs text-text-secondary italic bg-surface-muted/30 p-2 rounded-sm line-clamp-3 cursor-text hover:bg-surface-muted/50 transition-colors"
                                        onClick={() => setIsEditingNote(true)}
                                    >
                                        "{noteValue}"
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingNote(true)}
                                        className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 px-1 py-0.5 rounded-sm hover:bg-surface-muted/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                    >
                                        <MessageSquarePlus className="h-3 w-3" />
                                        Add note
                                    </button>
                                )
                            ) : marker.notes ? (
                                <div className="text-xs text-text-secondary italic bg-surface-muted/30 p-2 rounded-sm line-clamp-3">
                                    "{marker.notes}"
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
  }
);

CollectionMarkerCard.displayName = "CollectionMarkerCard";
