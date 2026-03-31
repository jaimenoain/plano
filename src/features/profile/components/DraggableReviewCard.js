import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReviewCard } from "@/features/feed/components/ReviewCard";
import { cn } from "@/lib/utils";
export function DraggableReviewCard({ review, className, showCommunityImages, isUpdating, isDragEnabled = true }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, } = useSortable({
        id: review.id,
        disabled: !isDragEnabled
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (_jsxs(motion.div, { layout: true, layoutId: review.id, ref: setNodeRef, style: style, ...attributes, ...listeners, className: cn("relative outline-none", isDragging ? "opacity-0" : (isDragEnabled ? "cursor-grab" : ""), className), children: [_jsx(ReviewCard, { entry: review, variant: "compact", hideUser: true, imagePosition: "left", showCommunityImages: showCommunityImages }), isUpdating && (_jsx("div", { className: "absolute inset-0 bg-surface-default/50 backdrop-blur-[1px] flex items-center justify-center rounded-sm z-10", children: _jsxs("div", { className: "bg-surface-card border border-border-default rounded-sm px-3 py-1.5 flex items-center gap-2 shadow-none", children: [_jsx(Loader2, { className: "w-3 h-3 animate-spin text-brand-primary" }), _jsx("span", { className: "text-xs font-medium text-text-primary", children: "Saving..." })] }) }))] }));
}
