import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Bookmark } from "lucide-react";
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
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[280px] bg-secondary/30 rounded-xl flex flex-col h-full overflow-hidden snap-center border border-border/40"
      )}
    >
      {/* Header */}
      <div className="p-4 font-medium sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b border-border/40 flex items-center justify-between">
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
      <div className="flex-1 overflow-y-auto p-3">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}
