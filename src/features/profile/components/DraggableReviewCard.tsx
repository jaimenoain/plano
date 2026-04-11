import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReviewCardFeed } from "@/features/feed/components/ReviewCardFeed";
import { FeedReview } from "@/types/feed";
import { cn } from "@/lib/utils";

interface DraggableReviewCardProps {
  review: FeedReview;
  className?: string;
  showCommunityImages?: boolean;
  isUpdating?: boolean;
  isDragEnabled?: boolean;
}

export function DraggableReviewCard({ review, className, showCommunityImages, isUpdating, isDragEnabled = true }: DraggableReviewCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: review.id,
    disabled: !isDragEnabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      layout
      layoutId={review.id}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative outline-none",
        isDragging ? "opacity-0" : (isDragEnabled ? "cursor-grab" : ""),
        className
      )}
    >
      <ReviewCardFeed
        entry={review}
        variant="compact"
        hideUser
        imagePosition="left"
        showCommunityImages={showCommunityImages}
      />

      {isUpdating && (
        <div className="absolute inset-0 bg-surface-default/50 backdrop-blur-[1px] flex items-center justify-center rounded-sm z-10">
          <div className="bg-surface-card border border-border-default rounded-sm px-3 py-1.5 flex items-center gap-2 shadow-none">
            <Loader2 className="w-3 h-3 animate-spin text-brand-primary" />
            <span className="text-xs font-medium text-text-primary">Saving...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
