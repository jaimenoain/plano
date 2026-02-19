import { FeedReview } from "@/types/feed";
import { Bookmark } from "lucide-react";

interface ProfileKanbanViewProps {
  items: FeedReview[];
}

export function ProfileKanbanView({ items }: ProfileKanbanViewProps) {
  // Logic to partition buildings
  const savedItems = items.filter(i => i.rating === null || i.rating === 0);
  const onePointItems = items.filter(i => i.rating === 1);
  const twoPointItems = items.filter(i => i.rating === 2);
  const threePointItems = items.filter(i => i.rating === 3);

  const columns = [
    {
      id: "saved",
      title: "Saved",
      items: savedItems,
      icon: <Bookmark className="w-4 h-4" />
    },
    {
      id: "1-point",
      title: "1 Point",
      items: onePointItems,
      icon: <span className="text-foreground text-sm">●</span>
    },
    {
      id: "2-points",
      title: "2 Points",
      items: twoPointItems,
      icon: <span className="text-foreground text-sm tracking-tighter">●●</span>
    },
    {
      id: "3-points",
      title: "3 Points",
      items: threePointItems,
      icon: <span className="text-foreground text-sm tracking-tighter">●●●</span>
    },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)] min-h-[500px] snap-x snap-mandatory px-1">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex-shrink-0 w-[280px] bg-secondary/30 rounded-xl flex flex-col h-full overflow-hidden snap-center border border-border/40"
        >
          {/* Sticky Header */}
          <div className="p-4 font-medium sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-foreground flex items-center justify-center w-6 h-6 rounded-full bg-secondary/50">
                {col.icon}
              </span>
              <span className="text-sm font-semibold">{col.title}</span>
            </div>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {col.items.length}
            </span>
          </div>

          {/* Column Body */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Empty state placeholder */}
            {col.items.length === 0 && (
                <div className="h-32 flex items-center justify-center text-muted-foreground/40 text-sm italic">
                    Empty
                </div>
            )}

            {/* Verification: Just listing IDs for now if any exist to prove partitioning logic works, hidden or minimal */}
             <div className="space-y-2">
                {/* Eventually cards will go here. For now just empty shells as requested. */}
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}
