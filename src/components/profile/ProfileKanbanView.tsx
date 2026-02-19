import { FeedReview } from "@/types/feed";
import { KanbanColumn } from "./KanbanColumn";
import { DraggableReviewCard } from "./DraggableReviewCard";

interface ProfileKanbanViewProps {
  kanbanData: {
    saved: FeedReview[];
    onePoint: FeedReview[];
    twoPoints: FeedReview[];
    threePoints: FeedReview[];
  };
}

export function ProfileKanbanView({ kanbanData }: ProfileKanbanViewProps) {
  const columns = [
    {
      id: "saved",
      title: "Saved",
      items: kanbanData.saved,
      ratingValue: 0
    },
    {
      id: "1-point",
      title: "1 Point",
      items: kanbanData.onePoint,
      ratingValue: 1
    },
    {
      id: "2-points",
      title: "2 Points",
      items: kanbanData.twoPoints,
      ratingValue: 2
    },
    {
      id: "3-points",
      title: "3 Points",
      items: kanbanData.threePoints,
      ratingValue: 3
    },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)] min-h-[500px] snap-x snap-mandatory px-1">
      {columns.map((col) => (
        <KanbanColumn
          key={col.id}
          id={col.id}
          title={col.title}
          ratingValue={col.ratingValue}
          items={col.items.map(i => i.id)}
        >
            <div className="space-y-3 min-h-[50px]">
             {col.items.map((item) => (
               <DraggableReviewCard key={item.id} review={item} />
             ))}
             {col.items.length === 0 && (
                <div className="h-32 flex items-center justify-center text-muted-foreground/40 text-sm italic border-2 border-dashed border-border/30 rounded-lg">
                    Empty
                </div>
            )}
          </div>
        </KanbanColumn>
      ))}
    </div>
  );
}
