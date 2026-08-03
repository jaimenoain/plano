import { forwardRef, useState, useRef, useEffect } from "react";
import { CollectionItemWithBuilding } from "@/features/collections/types";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Save, MessageSquarePlus, GripVertical, Medal, Trash2, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { getBuildingImageUrl } from "@/utils/image";
import { primaryBuildingCreditsToSummaries } from "@/features/credits/api/credits";

interface CollectionBuildingCardProps {
  item: CollectionItemWithBuilding;
  isHighlighted: boolean;
  setHighlightedId: (id: string | null) => void;
  canEdit: boolean;
  onUpdateNote: (newNote: string) => void;
  onNavigate: () => void;
  categorizationMethod?: 'default' | 'custom' | 'status' | 'rating_member' | 'uniform';
  customCategories?: { id: string; label: string; color: string }[] | null;
  onUpdateCategory?: (categoryId: string) => void;
  showImages?: boolean;
  onRemove?: () => void;
  // Itinerary specific props
  isDraggable?: boolean;
  dragHandleProps?: Record<string, unknown>;
  badgeIndex?: number;
  /** Tighter row for the itinerary drag-and-drop list: small side thumbnail instead of a full-width image, condensed spacing. */
  compact?: boolean;
}

export const CollectionBuildingCard = forwardRef<HTMLDivElement, CollectionBuildingCardProps>(
  ({
    item,
    isHighlighted,
    setHighlightedId,
    canEdit,
    onUpdateNote,
    onNavigate,
    categorizationMethod,
    customCategories,
    onUpdateCategory,
    showImages = true,
    onRemove,
    isDraggable,
    dragHandleProps,
    badgeIndex,
    compact = false,
  }, ref) => {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteValue, setNoteValue] = useState(item.note || "");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setNoteValue(item.note || "");
    }, [item.note]);

    // Auto-focus textarea when editing starts
    useEffect(() => {
        if (isEditingNote && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditingNote]);

    const handleNoteBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        onUpdateNote(value);
        setIsEditingNote(false);
    };

    const currentCategory = customCategories?.find(c => c.id === item.custom_category_id);
    const imageUrl = getBuildingImageUrl(item.building.hero_image_url || item.building.community_preview_url);

    const creditNames = primaryBuildingCreditsToSummaries(item.building.building_credits ?? [])
      .map((c) => c.name)
      .join(", ");

    return (
        <Card
            ref={ref}
            className={cn(
                "group relative overflow-hidden transition-colors duration-150 cursor-pointer bg-surface-card border border-border-default rounded-none shadow-none",
                isHighlighted
                    ? "border-brand-primary ring-1 ring-brand-primary bg-brand-secondary/50"
                    : "hover:border-border-strong"
            )}
            onMouseEnter={() => setHighlightedId(item.building.id)}
            onMouseLeave={() => setHighlightedId(null)}
            onClick={() => {
                setHighlightedId(item.building.id);
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
                    <Button variant="destructive" size="icon-sm" onClick={onRemove} title="Remove from collection">
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            )}
            <div className={cn("flex flex-col", !compact && "min-h-28")}>
                {/* Drag Handle + Content */}
                <div className="flex items-stretch">
                    {isDraggable && (
                        <div
                            className={cn(
                                "flex items-center justify-center cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary hover:bg-surface-muted/50 transition-colors border-r border-border-default",
                                compact ? "px-1.5" : "px-2"
                            )}
                            {...dragHandleProps}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>
                    )}

                    {compact && showImages && (
                        <div className="w-10 h-10 shrink-0 self-center ml-2 rounded-sm overflow-hidden bg-surface-muted">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-secondary">
                                    <Building2 className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                    )}

                    <div className={cn("flex-1 min-w-0 flex flex-col justify-between", compact ? "p-2" : "p-3")}>
                    <div>
                        <div className="flex justify-between items-start gap-2 min-w-0">
                             <div className="flex items-start gap-2 min-w-0">
                                {badgeIndex !== undefined && (
                                    <div className={cn(
                                        "flex items-center justify-center min-w-5 h-5 rounded-sm bg-brand-primary text-[10px] font-bold text-brand-primary-foreground px-1",
                                        compact ? "mt-px" : "mt-0.5"
                                    )}>
                                        {badgeIndex}
                                    </div>
                                )}
                                <h3 className={cn(
                                    "font-semibold leading-tight text-text-primary",
                                    compact ? "text-xs line-clamp-1" : "text-sm line-clamp-2"
                                )}>
                                    {item.building.name}
                                </h3>
                                {item.building.winner_award_name && !compact && (
                                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-1.5 py-0 h-4 text-[9px] uppercase tracking-wider font-bold shrink-0">
                                        <Medal className="h-2.5 w-2.5 mr-1" />
                                        Winner
                                    </Badge>
                                )}
                             </div>
                        </div>

                        {!compact && (
                            <div className="text-xs text-text-secondary mt-1 line-clamp-1">
                                 <span>{creditNames || "—"}</span>
                                 {item.building.year_completed && (
                                    <>
                                      <span className="mx-1">•</span>
                                      <span>{item.building.year_completed}</span>
                                    </>
                                 )}
                            </div>
                        )}

                        {/* Category Badge (only for custom method) */}
                        {categorizationMethod === 'custom' && !compact && (
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                {canEdit ? (
                                    <Select
                                        value={item.custom_category_id || "unassigned"}
                                        onValueChange={(val) => onUpdateCategory?.(val === "unassigned" ? "" : val)}
                                    >
                                        <SelectTrigger className="h-auto p-0 border-none bg-transparent hover:bg-transparent shadow-none w-auto ring-0 focus:ring-0">
                                             <div className="flex items-center gap-2 px-1 py-0.5 rounded-sm hover:bg-surface-muted/50 transition-colors cursor-pointer">
                                                 {/* Sidebar legend, not a map marker: this is the one
                                                     surface where a member's chosen category colour is
                                                     still shown. Uncategorised falls back to a token. */}
                                                 <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: currentCategory?.color || "var(--border-strong)" }}
                                                 />
                                                 <span className="truncate max-w-[120px] text-sm text-text-primary">
                                                    {currentCategory?.label || "Uncategorized"}
                                                 </span>
                                             </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned" className="text-text-secondary italic">Uncategorized</SelectItem>
                                            {customCategories?.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                                        <span>{cat.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    currentCategory && (
                                        <div className="flex items-center gap-2 px-1 py-0.5">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: currentCategory.color }}
                                            />
                                            <span className="text-sm text-text-primary">{currentCategory.label}</span>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* Note Section */}
                    <div className={cn(compact ? "mt-0.5" : "mt-2")} onClick={(e) => e.stopPropagation()}>
                        {canEdit ? (
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
                                   onClick={() => setIsEditingNote(true)}
                                   className={cn(
                                       "text-text-secondary hover:text-text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                                       compact ? "text-[11px]" : "text-xs px-1 py-0.5 rounded-sm hover:bg-surface-muted/50 transition-colors"
                                   )}
                               >
                                   <MessageSquarePlus className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                                   Add note
                               </button>
                            )
                        ) : item.note ? (
                            compact ? (
                                <div className="text-[11px] text-text-secondary italic line-clamp-1">
                                    "{item.note}"
                                </div>
                            ) : (
                                <div className="text-xs text-text-secondary italic bg-surface-muted/30 p-2 rounded-sm line-clamp-3">
                                    "{item.note}"
                                </div>
                            )
                        ) : null}
                    </div>
                    </div>
                </div>

                {/* Image Section */}
                {showImages && !compact && (
                    <div className="relative w-full border-t border-border-default bg-surface-muted">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={item.building.name}
                                className="w-full aspect-4/3 object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full aspect-4/3 flex items-center justify-center text-text-secondary bg-surface-muted">
                                <span className="text-xs">No Image</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
  }
);

CollectionBuildingCard.displayName = "CollectionBuildingCard";
