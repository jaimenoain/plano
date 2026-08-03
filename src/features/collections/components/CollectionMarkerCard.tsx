import { forwardRef, useEffect, useRef, useState, type FocusEvent } from "react";
import { CollectionMarker } from "@/features/collections/types";
import { cn } from "@/lib/utils";
import { GripVertical, MessageSquarePlus, Save, Trash2 } from "lucide-react";
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
  /** Tighter row for the itinerary drag-and-drop list: condensed spacing and single-line note. */
  compact?: boolean;
}

export const CollectionMarkerCard = forwardRef<HTMLDivElement, CollectionMarkerCardProps>(
  ({ marker, isHighlighted, setHighlightedId, canEdit, onRemove, onNavigate, isDraggable, dragHandleProps, badgeIndex, onUpdateNote, compact = false }, ref) => {
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
                    className={cn(
                        "absolute right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                        compact ? "top-1" : "top-2"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={onRemove}
                        title="Remove from collection"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            )}
            <div className={cn("flex flex-row", !compact && "min-h-14")}>
                {/* Drag Handle */}
                {isDraggable && (
                    <div
                        className={cn(
                            "flex items-center justify-center cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary hover:bg-surface-muted/50 transition-colors border-r",
                            compact ? "px-1.5" : "px-2"
                        )}
                        {...dragHandleProps}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                )}

                {/* Content Section */}
                <div className={cn("flex flex-1 items-start min-w-0", compact ? "p-1.5 gap-2" : "p-2 gap-3")}>
                    <div className={cn("bg-surface-muted/50 rounded-sm shrink-0", compact ? "p-1" : "p-1.5")}>
                        <Icon className="w-4 h-4 text-text-secondary" />
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-start gap-2 min-w-0">
                            {badgeIndex !== undefined && (
                                <div className={cn(
                                    "flex items-center justify-center min-w-5 h-5 rounded-sm bg-brand-primary text-[10px] font-bold text-brand-primary-foreground px-1 shrink-0",
                                    compact ? "mt-px" : "mt-0.5"
                                )}>
                                    {badgeIndex}
                                </div>
                            )}
                            <h3 className={cn(
                                "font-semibold leading-tight text-text-primary",
                                compact ? "text-xs line-clamp-1" : "text-sm line-clamp-2"
                            )}>
                                {marker.name}
                            </h3>
                        </div>

                        {displayAddress && !compact && (
                            <div className="text-xs text-text-secondary mt-1 line-clamp-1">
                                {displayAddress}
                            </div>
                        )}

                        <div className={compact ? "mt-0.5" : "mt-2"} onClick={(e) => e.stopPropagation()}>
                            {canEdit && onUpdateNote ? (
                                isEditingNote ? (
                                    <div className="relative group/note">
                                        <Textarea
                                            ref={textareaRef}
                                            placeholder="Add a note..."
                                            value={noteValue}
                                            onChange={(e) => setNoteValue(e.target.value)}
                                            onBlur={handleNoteBlur}
                                            className={cn(
                                                "resize-none text-xs bg-surface-muted/30 border-transparent focus:border-border-default focus:bg-surface-default transition-colors p-2",
                                                compact ? "min-h-[32px]" : "min-h-[40px]"
                                            )}
                                            rows={compact ? 2 : 3}
                                        />
                                        <div className="absolute bottom-1 right-1 opacity-50 pointer-events-none">
                                            <Save className="h-3 w-3" />
                                        </div>
                                    </div>
                                ) : noteValue ? (
                                    compact ? (
                                        <div
                                            className="text-[11px] text-text-secondary italic line-clamp-1 cursor-text hover:text-text-primary transition-colors"
                                            onClick={() => setIsEditingNote(true)}
                                        >
                                            "{noteValue}"
                                        </div>
                                    ) : (
                                        <div
                                            className="text-xs text-text-secondary italic bg-surface-muted/30 p-2 rounded-sm line-clamp-3 cursor-text hover:bg-surface-muted/50 transition-colors"
                                            onClick={() => setIsEditingNote(true)}
                                        >
                                            "{noteValue}"
                                        </div>
                                    )
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingNote(true)}
                                        className={cn(
                                            "text-text-secondary hover:text-text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                                            compact ? "text-[11px]" : "text-xs px-1 py-0.5 rounded-sm hover:bg-surface-muted/50"
                                        )}
                                    >
                                        <MessageSquarePlus className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                                        Add note
                                    </button>
                                )
                            ) : marker.notes ? (
                                compact ? (
                                    <div className="text-[11px] text-text-secondary italic line-clamp-1">
                                        "{marker.notes}"
                                    </div>
                                ) : (
                                    <div className="text-xs text-text-secondary italic bg-surface-muted/30 p-2 rounded-sm line-clamp-3">
                                        "{marker.notes}"
                                    </div>
                                )
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
