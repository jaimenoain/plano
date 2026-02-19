import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReviewCard } from "@/components/feed/ReviewCard";
import { FeedReview } from "@/types/feed";
import { cn } from "@/lib/utils";

interface DraggableReviewCardProps {
  review: FeedReview;
  className?: string;
}

export function DraggableReviewCard({ review, className }: DraggableReviewCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: review.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none transition-all duration-200 outline-none",
        isDragging ? "scale-105 shadow-xl z-50 opacity-90 cursor-grabbing" : "cursor-grab",
        className
      )}
    >
      <ReviewCard
        entry={review}
        variant="compact"
        hideUser
        imagePosition="left"
        // Prevent click events from propagating to drag
        // Wait, ReviewCard handles clicks internally for navigation.
        // dnd-kit handles drag start based on movement.
        // Usually fine unless buttons are clicked.
      />
    </div>
  );
}
