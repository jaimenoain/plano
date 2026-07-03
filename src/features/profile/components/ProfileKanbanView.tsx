import { ChevronRight } from "lucide-react";
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
  showCommunityImages?: boolean;
  updatingItemId?: string | null;
  isDragEnabled?: boolean;
}

export function ProfileKanbanView({ kanbanData, showCommunityImages, updatingItemId, isDragEnabled = true }: ProfileKanbanViewProps) {
  const columns = [
    {
      id: "saved",
      title: "Saved",
      items: kanbanData.saved,
      ratingValue: 0
    },
    {
      id: "1-point",
      title: "Impressive",
      items: kanbanData.onePoint,
      ratingValue: 1
    },
    {
      id: "2-points",
      title: "Essential",
      items: kanbanData.twoPoints,
      ratingValue: 2
    },
    {
      id: "3-points",
      title: "Masterpiece",
      items: kanbanData.threePoints,
      ratingValue: 3
    },
  ];

  return (
    <div className="relative w-full min-w-0 max-w-[100vw]">
      <div className="w-full min-w-0 flex gap-4 overflow-x-scroll-touch pb-4 h-[calc(100vh-140px)] min-h-[500px] snap-x snap-mandatory pl-4 pr-12 md:px-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            ratingValue={col.ratingValue}
            items={col.items.map(i => i.id)}
          >
              <div className="space-y-3">
               {col.items.map((item, itemIndex) => (
                 <DraggableReviewCard
                    key={item.id}
                    review={item}
                    cardIndex={itemIndex}
                    showCommunityImages={showCommunityImages}
                    isUpdating={item.id === updatingItemId}
                    isDragEnabled={isDragEnabled}
                 />
               ))}
            </div>
          </KanbanColumn>
        ))}
      </div>
      <div className="md:hidden absolute right-0 top-0 bottom-4 w-12 bg-linear-to-l from-surface-default via-surface-default/80 to-transparent pointer-events-none flex items-center justify-end pr-1 opacity-80">
        <ChevronRight className="w-8 h-8 animate-pulse text-text-secondary/70" />
      </div>
    </div>
  );
}
