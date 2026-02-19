import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Bookmark, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  ratingValue: number | null;
  items: (string | number)[];
  children: React.ReactNode;
}

export function KanbanColumn({
  id,
  title,
  ratingValue,
  items,
  children,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const getGhostLabel = () => {
    switch(ratingValue) {
        case 0:
        case null:
            return "Drag here to save for later";
        case 1:
            return "Drag here to rate 1/3";
        case 2:
            return "Drag here to rate 2/3";
        case 3:
            return "Drag here to rate 3/3";
        default:
            return "Drag items here";
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[280px] rounded-xl flex flex-col h-full overflow-hidden snap-center border transition-all duration-200 min-h-[500px]",
        isOver
            ? "bg-secondary/40 border-primary/30 ring-1 ring-primary/20 shadow-sm"
            : "bg-secondary/20 border-border/60"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 font-medium sticky top-0 backdrop-blur-sm z-10 border-b flex items-center justify-between transition-colors duration-200",
        isOver ? "bg-background/90 border-primary/20" : "bg-background/80 border-border/40"
      )}>
        <div className="flex items-center gap-2">
          <span className="text-foreground flex items-center justify-center w-6 h-6 rounded-full bg-secondary/50">
            {ratingValue === 0 || ratingValue === null ? (
              <Bookmark className="w-4 h-4" aria-label="Saved" />
            ) : (
              <span className="text-foreground text-sm tracking-tighter" aria-label={`${ratingValue} point${ratingValue > 1 ? 's' : ''}`}>
                {"●".repeat(ratingValue)}
              </span>
            )}
          </span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>

        {items.length === 0 && (
            <div className={cn(
                "flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg transition-all duration-200 flex-1 min-h-[200px]",
                isOver
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border/40 text-muted-foreground/60 hover:border-border/60 hover:bg-secondary/30"
            )}>
                <div className="mb-2 p-3 rounded-full bg-background/50">
                    {ratingValue === 0 || ratingValue === null ? (
                        <Bookmark className="w-5 h-5 opacity-50" />
                    ) : (
                        <Plus className="w-5 h-5 opacity-50" />
                    )}
                </div>
                <p className="text-sm font-medium opacity-80">
                    {ratingValue === 0 || ratingValue === null ? "No saved buildings" : `No ${ratingValue}-point buildings`}
                </p>
                <p className="text-xs mt-1 opacity-60 max-w-[150px]">
                    {getGhostLabel()}
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
