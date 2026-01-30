import { forwardRef, useState, useRef, useEffect } from "react";
import { CollectionItemWithBuilding } from "@/types/collection";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Save, MessageSquarePlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { getBuildingImageUrl } from "@/utils/image";

interface CollectionBuildingCardProps {
  item: CollectionItemWithBuilding;
  isHighlighted: boolean;
  setHighlightedId: (id: string | null) => void;
  canEdit: boolean;
  onUpdateNote: (newNote: string) => void;
  onNavigate: () => void;
  categorizationMethod?: 'default' | 'custom' | 'status' | 'rating_member';
  customCategories?: { id: string; label: string; color: string }[] | null;
  onUpdateCategory?: (categoryId: string) => void;
  showImages?: boolean;
}

export const CollectionBuildingCard = forwardRef<HTMLDivElement, CollectionBuildingCardProps>(
  ({ item, isHighlighted, setHighlightedId, canEdit, onUpdateNote, onNavigate, categorizationMethod, customCategories, onUpdateCategory, showImages = true }, ref) => {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus textarea when editing starts
    useEffect(() => {
        if (isEditingNote && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditingNote]);

    const handleNoteBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        onUpdateNote(value);
        if (!value) {
            setIsEditingNote(false);
        }
    };

    const currentCategory = customCategories?.find(c => c.id === item.custom_category_id);
    const imageUrl = getBuildingImageUrl(item.building.hero_image_url || item.building.community_preview_url);

    const architectNames = item.building.building_architects
      ?.map((ba) => ba.architects?.name)
      .filter(Boolean)
      .join(", ");

    return (
        <Card
            ref={ref}
            className={cn(
                "group relative overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md",
                isHighlighted ? "border-primary ring-1 ring-primary bg-secondary/5" : "hover:border-primary/50"
            )}
            onMouseEnter={() => setHighlightedId(item.building.id)}
            onMouseLeave={() => setHighlightedId(null)}
            onClick={() => {
                setHighlightedId(item.building.id);
                onNavigate();
            }}
        >
            <div className="flex flex-row min-h-[7rem]">
                {/* Content Section */}
                <div className="flex flex-col flex-1 p-3 min-w-0 justify-between">
                    <div>
                        <div className="flex justify-between items-start gap-2">
                             <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                                {item.building.name}
                             </h3>
                        </div>

                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                             <span>{architectNames || "Unknown Architect"}</span>
                             {item.building.year_completed && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span>{item.building.year_completed}</span>
                                </>
                             )}
                        </div>

                        {/* Category Badge (only for custom method) */}
                        {categorizationMethod === 'custom' && (
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                {canEdit ? (
                                    <Select
                                        value={item.custom_category_id || "unassigned"}
                                        onValueChange={(val) => onUpdateCategory?.(val === "unassigned" ? "" : val)}
                                    >
                                        <SelectTrigger className="h-auto p-0 border-none bg-transparent hover:bg-transparent shadow-none w-auto ring-0 focus:ring-0">
                                             <Badge variant="outline" className="flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 font-normal hover:bg-secondary cursor-pointer bg-background">
                                                 <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: currentCategory?.color || "#9CA3AF" }}
                                                 />
                                                 <span className="truncate max-w-[120px]">
                                                    {currentCategory?.label || "Uncategorized"}
                                                 </span>
                                             </Badge>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned" className="text-muted-foreground italic">Uncategorized</SelectItem>
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
                                        <Badge variant="outline" className="flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 font-normal bg-background">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: currentCategory.color }}
                                            />
                                            <span>{currentCategory.label}</span>
                                        </Badge>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* Note Section */}
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        {canEdit ? (
                            isEditingNote || item.note ? (
                                <div className="relative group/note">
                                    <Textarea
                                        ref={textareaRef}
                                        placeholder="Add a note..."
                                        defaultValue={item.note || ""}
                                        onBlur={handleNoteBlur}
                                        onFocus={() => setIsEditingNote(true)}
                                        className={cn(
                                            "resize-none text-xs min-h-[40px] bg-secondary/30 border-transparent focus:border-input focus:bg-background transition-colors p-2",
                                            !isEditingNote && "hover:bg-secondary/50 cursor-text truncate"
                                        )}
                                        rows={isEditingNote ? 3 : 1}
                                    />
                                     {isEditingNote && (
                                        <div className="absolute bottom-1 right-1 opacity-50 pointer-events-none">
                                            <Save className="h-3 w-3" />
                                        </div>
                                     )}
                                </div>
                            ) : (
                               <button
                                   onClick={() => setIsEditingNote(true)}
                                   className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1 py-0.5 rounded hover:bg-secondary/50 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                   <MessageSquarePlus className="h-3 w-3" />
                                   Add note
                               </button>
                            )
                        ) : item.note ? (
                            <div className="text-xs text-muted-foreground italic bg-secondary/30 p-2 rounded line-clamp-3">
                                "{item.note}"
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Image Section */}
                {showImages && (
                    <div className="w-28 shrink-0 relative border-l bg-secondary">
                         {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={item.building.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
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
