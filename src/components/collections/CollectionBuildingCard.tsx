import { forwardRef, useState, useRef, useEffect } from "react";
import { CollectionItemWithBuilding } from "@/types/collection";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Save, MessageSquarePlus, Trash, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBuildingImageUrl } from "@/utils/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CollectionBuildingCardProps {
  item: CollectionItemWithBuilding;
  isHighlighted: boolean;
  setHighlightedId: (id: string) => void;
  canEdit: boolean;
  onUpdateNote: (newNote: string) => void;
  onNavigate: () => void;
  categorizationMethod?: 'default' | 'custom';
  customCategories?: { id: string; label: string; color: string }[] | null;
  onUpdateCategory?: (categoryId: string) => void;
  onRemove?: () => void;
}

export const CollectionBuildingCard = forwardRef<HTMLDivElement, CollectionBuildingCardProps>(
  ({ item, isHighlighted, setHighlightedId, canEdit, onUpdateNote, onNavigate, categorizationMethod, customCategories, onUpdateCategory, onRemove }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const hasNote = !!item.note;
    const showInput = hasNote || isEditing;
    const imageUrl = getBuildingImageUrl(item.building.hero_image_url);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        onUpdateNote(value);
        if (!value) {
            setIsEditing(false);
        }
    };

    const currentCategory = customCategories?.find(c => c.id === item.custom_category_id);

    return (
        <div
            ref={ref}
            className={cn(
                "group relative p-3 border rounded-xl shadow-sm transition-all duration-200 cursor-pointer bg-card hover:shadow-md",
                isHighlighted ? "border-primary ring-1 ring-primary bg-secondary/10" : "hover:border-primary/50"
            )}
            onMouseEnter={() => setHighlightedId(item.building.id)}
            onClick={() => {
                setHighlightedId(item.building.id);
                onNavigate();
            }}
        >
            <div className="flex gap-4">
                {/* Image Section */}
                <div className="w-24 h-24 shrink-0 rounded-md overflow-hidden bg-secondary border border-border/50">
                    {imageUrl ? (
                        <img src={imageUrl} alt={item.building.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
                            <Building2 className="h-8 w-8 opacity-50 mb-1" />
                            <span className="text-[10px] font-medium uppercase tracking-wider">No Image</span>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                        <div className="flex justify-start items-center gap-2 pr-6">
                             <h3 className="font-semibold text-base leading-tight truncate text-foreground/90">{item.building.name}</h3>
                             {/* Category Dot */}
                             {categorizationMethod === 'custom' && currentCategory && (
                                 <div
                                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ring-2 ring-background"
                                    style={{ backgroundColor: currentCategory.color }}
                                    title={currentCategory.label}
                                 />
                             )}
                        </div>

                        <div className="mt-1 space-y-0.5">
                             <p className="text-sm text-muted-foreground truncate">{item.building.city}, {item.building.country}</p>
                             {item.building.year_completed && (
                                 <p className="text-xs text-muted-foreground/80">{item.building.year_completed}</p>
                             )}
                        </div>
                    </div>

                    {/* Category Selector (Edit Mode) */}
                    {canEdit && categorizationMethod === 'custom' && customCategories && customCategories.length > 0 && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <Select
                                value={item.custom_category_id || "unassigned"}
                                onValueChange={(val) => onUpdateCategory?.(val === "unassigned" ? "" : val)}
                            >
                                <SelectTrigger className="h-6 text-xs w-auto min-w-[120px] max-w-full bg-secondary/30 border-none px-2 rounded-md hover:bg-secondary/50 focus:ring-0">
                                    <div className="flex items-center gap-1.5 truncate">
                                        {currentCategory && (
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: currentCategory.color }} />
                                        )}
                                        <SelectValue placeholder="Select category" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <SelectItem value="unassigned" className="text-muted-foreground italic text-xs">Uncategorized</SelectItem>
                                    {customCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                                <span>{cat.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Note Section */}
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                {canEdit ? (
                    showInput ? (
                        <div className="relative group/note">
                            <Textarea
                                ref={textareaRef}
                                placeholder="Add a personal note..."
                                defaultValue={item.note || ""}
                                onBlur={handleBlur}
                                className="resize-none text-sm min-h-[80px] bg-muted/30 border-transparent hover:border-border focus:border-primary/50 focus:bg-background transition-all rounded-lg p-3"
                            />
                            <div className="absolute bottom-2 right-2 text-primary opacity-0 group-focus-within/note:opacity-100 transition-opacity pointer-events-none">
                                <Save className="h-3 w-3" />
                            </div>
                        </div>
                    ) : (
                       <button
                           onClick={() => setIsEditing(true)}
                           className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 py-2 rounded-md border border-dashed border-transparent hover:border-border transition-all flex items-center justify-center gap-2"
                       >
                           <MessageSquarePlus className="h-3 w-3" />
                           Add a note
                       </button>
                    )
                ) : item.note ? (
                    <div className="bg-muted/30 p-3 rounded-lg text-sm text-muted-foreground border border-border/50 relative">
                        <span className="italic">"{item.note}"</span>
                    </div>
                ) : null}
            </div>

            {/* Delete Button */}
            {canEdit && onRemove && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={onRemove}
                        title="Remove from collection"
                     >
                        <Trash className="h-4 w-4" />
                     </Button>
                </div>
            )}
        </div>
    );
  }
);

CollectionBuildingCard.displayName = "CollectionBuildingCard";
