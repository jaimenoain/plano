import { forwardRef, useState, useRef, useEffect } from "react";
import { CollectionItemWithBuilding } from "@/types/collection";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Save, MessageSquarePlus } from "lucide-react";

interface CollectionBuildingCardProps {
  item: CollectionItemWithBuilding;
  isHighlighted: boolean;
  setHighlightedId: (id: string) => void;
  canEdit: boolean;
  onUpdateNote: (newNote: string) => void;
  onNavigate: () => void;
}

export const CollectionBuildingCard = forwardRef<HTMLDivElement, CollectionBuildingCardProps>(
  ({ item, isHighlighted, setHighlightedId, canEdit, onUpdateNote, onNavigate }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // If there is a note, we show it (either as textarea or static text depending on design,
    // but typically if we have a note we want to see it).
    // The requirement is "hide empty input by default".
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

    return (
        <div
            ref={ref}
            className={cn(
                "group p-4 border rounded-lg shadow-sm transition-all duration-200 cursor-pointer bg-card hover:shadow-md",
                isHighlighted ? "border-primary ring-1 ring-primary bg-secondary/10" : "hover:border-primary/50"
            )}
            onMouseEnter={() => setHighlightedId(item.building.id)}
            onClick={() => {
                setHighlightedId(item.building.id);
                onNavigate();
            }}
        >
            <div className="flex gap-3">
                {item.building.hero_image_url ? (
                    <div className="w-20 h-20 rounded-md overflow-hidden shrink-0 bg-secondary">
                        <img src={item.building.hero_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-20 h-20 rounded-md bg-secondary shrink-0 flex items-center justify-center text-muted-foreground text-xs p-1 text-center">
                        No Image
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{item.building.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{item.building.city}, {item.building.country}</p>
                    {item.building.year_completed && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.building.year_completed}</p>
                    )}
                </div>
            </div>

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
