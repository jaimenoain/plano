import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronRight } from "lucide-react";
import { KanbanColumn } from "./KanbanColumn";
import { DraggableReviewCard } from "./DraggableReviewCard";
export function ProfileKanbanView({ kanbanData, showCommunityImages, updatingItemId, isDragEnabled = true }) {
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
    return (_jsxs("div", { className: "relative w-full min-w-0 max-w-[100vw]", children: [_jsx("div", { className: "w-full min-w-0 flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-140px)] min-h-[500px] snap-x snap-mandatory pl-4 pr-12 md:px-4", children: columns.map((col) => (_jsx(KanbanColumn, { id: col.id, title: col.title, ratingValue: col.ratingValue, items: col.items.map(i => i.id), children: _jsx("div", { className: "space-y-3", children: col.items.map((item) => (_jsx(DraggableReviewCard, { review: item, showCommunityImages: showCommunityImages, isUpdating: item.id === updatingItemId, isDragEnabled: isDragEnabled }, item.id))) }) }, col.id))) }), _jsx("div", { className: "md:hidden absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-surface-default via-surface-default/80 to-transparent pointer-events-none flex items-center justify-end pr-1 opacity-80", children: _jsx(ChevronRight, { className: "w-8 h-8 animate-pulse text-text-secondary/70" }) })] }));
}
