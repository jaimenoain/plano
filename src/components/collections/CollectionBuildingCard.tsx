import { forwardRef, useState, useRef, useEffect } from "react";
import { CollectionItemWithBuilding } from "@/types/collection";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Save, MessageSquarePlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBuildingImageUrl } from "@/utils/image";

interface CollectionBuildingCardProps {
  item: CollectionItemWithBuilding;
  isHighlighted: boolean;
  setHighlightedId: (id: string) => void;
  canEdit: boolean;
  onUpdateNote: (newNote: string) => void;
  onNavigate: () => void;
  // New props
  categorizationMethod?: 'default' | 'custom';
  customCategories?: { id: string; label: string; color: string }[] | null;
  onUpdateCategory?: (categoryId: string) => void;
  showImages?: boolean;
}

export const CollectionBuildingCard = forwardRef<HTMLDivElement, CollectionBuildingCardProps>(
  ({ item, isHighlighted, setHighlightedId, canEdit, onUpdateNote, onNavigate, categorizationMethod, customCategories, onUpdateCategory, showImages = true }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const hasNote = !!item.note;
    const showInput = hasNote || isEditing;

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

    // Helper to find category color
    const currentCategory = customCategories?.find(c => c.id === item.custom_category_id);
    const imageUrl = getBuildingImageUrl(item.building.hero_image_url);

    return (
        <div
            ref={ref}
            className={cn(
                "group p-4 border rounded-lg shadow-sm transition-all duration-200 cursor-pointer bg-card hover:shadow-md",
                isHighlighted ? "border-primary ring-1 ring-primary bg-secondary/10" : "hover:border-primary/50"
            )}
            style={categorizationMethod === 'custom' && currentCategory ? { borderLeftColor: currentCategory.color, borderLeftWidth: '4px' } : {}}
            onMouseEnter={() => setHighlightedId(item.building.id)}
            onClick={() => {
                setHighlightedId(item.building.id);
                onNavigate();
            }}
        >
            <div className="flex gap-3">
                {showImages && (imageUrl ? (
                    <div className="w-20 h-20 rounded-md overflow-hidden shrink-0 bg-secondary">
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-20 h-20 rounded-md bg-secondary shrink-0 flex items-center justify-center text-muted-foreground text-xs p-1 text-center">
                        No Image
                    </div>
                ))}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                         <h3 className="font-semibold text-sm truncate pr-2">{item.building.name}</h3>
                         {/* Optional: Show category badge if not editing and valid category */}
                         {categorizationMethod === 'custom' && currentCategory && (
                             <div
                                className="w-2 h-2 rounded-full shrink-0 mt-1"
                                style={{ backgroundColor: currentCategory.color }}
                                title={currentCategory.label}
                             />
                         )}
                    </div>

                    <p className="text-xs text-muted-foreground truncate">{item.building.city}, {item.building.country}</p>
                    {item.building.year_completed && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.building.year_completed}</p>
                    )}
                </div>
            </div>

            {/* Custom Category Selector */}
            {canEdit && categorizationMethod === 'custom' && customCategories && customCategories.length > 0 && (
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <Select
                        value={item.custom_category_id || "unassigned"}
                        onValueChange={(val) => onUpdateCategory?.(val === "unassigned" ? "" : val)}
                    >
                        <SelectTrigger className="h-7 text-xs bg-secondary/30 border-none w-full">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned" className="text-muted-foreground italic">Uncategorized</SelectItem>
                            {customCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
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

            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                {canEdit ? (
                    showInput ? (
                        <div className="relative">
                            <Textarea
                                ref={textareaRef}
                                placeholder="Add a note..."
                                defaultValue={item.note || ""}
                                onBlur={handleBlur}
                                className="resize-none text-sm bg-background min-h-[60px]"
                            />
                            <div className="absolute bottom-2 right-2 opacity-50 pointer-events-none">
                                <Save className="h-3 w-3" />
                            </div>
                        </div>
                    ) : (
                       <button
                           onClick={() => setIsEditing(true)}
                           className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                           <MessageSquarePlus className="h-3 w-3" />
                           Add a note
                       </button>
                    )
                ) : item.note ? (
                    <div className="bg-secondary/30 p-2 rounded-md text-sm italic text-muted-foreground border">
                        "{item.note}"
                    </div>
                ) : null}
            </div>
        </div>
    );
  }
);

CollectionBuildingCard.displayName = "CollectionBuildingCard";
