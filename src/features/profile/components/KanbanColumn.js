import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Bookmark, Plus, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
export function KanbanColumn({ id, title, ratingValue, items, children, }) {
    const { setNodeRef, isOver } = useDroppable({
        id,
    });
    const { over } = useDndContext();
    const isOverContainer = isOver || (!!over && items.includes(over.id));
    const getGhostLabel = () => {
        switch (ratingValue) {
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
    return (_jsxs("div", { ref: setNodeRef, className: cn("flex-shrink-0 w-[280px] min-w-[280px] rounded-sm flex flex-col h-full overflow-hidden snap-center border transition-all duration-200", isOverContainer
            ? "bg-brand-secondary border-brand-primary shadow-none"
            : "bg-surface-muted border-border-default"), children: [_jsxs("div", { className: cn("p-4 font-medium sticky top-0 z-10 border-b flex items-center justify-between transition-colors duration-200 bg-surface-card", isOverContainer ? "border-brand-primary" : "border-border-default"), children: [_jsxs("div", { className: "flex items-center gap-2", children: [ratingValue === 0 || ratingValue === null ? (_jsx("span", { className: "text-text-primary flex items-center justify-center w-6 h-6 rounded-sm bg-surface-muted", children: _jsx(Bookmark, { className: "w-4 h-4", "aria-label": "Saved" }) })) : (_jsx("span", { className: "text-text-primary flex items-center justify-center h-6 px-1.5 rounded-sm bg-surface-muted", children: _jsx("div", { className: "flex items-center gap-0.5", "aria-label": `${ratingValue} point${ratingValue > 1 ? "s" : ""}`, children: Array.from({ length: 3 }).map((_, i) => (_jsx(Circle, { className: cn("w-3 h-3", i < (ratingValue ?? 0)
                                            ? "fill-brand-primary text-brand-primary"
                                            : "fill-transparent text-text-secondary/30") }, i))) }) })), _jsx("span", { className: "text-sm font-semibold", children: title })] }), _jsx("span", { className: "text-xs text-text-secondary bg-surface-muted px-2 py-0.5 rounded-sm", children: items.length })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-3 flex flex-col gap-3", children: [_jsx(SortableContext, { items: items, strategy: verticalListSortingStrategy, children: children }), items.length === 0 && (_jsxs("div", { className: cn("flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-sm transition-all duration-200 flex-1 min-h-[200px]", isOverContainer
                            ? "border-brand-primary bg-brand-secondary text-brand-secondary-foreground"
                            : "border-border-default/40 text-text-secondary/60 hover:border-border-default/60 hover:bg-surface-muted/30"), children: [_jsx("div", { className: "mb-2 p-3 rounded-sm bg-surface-default/50", children: ratingValue === 0 || ratingValue === null ? (_jsx(Bookmark, { className: "w-5 h-5 opacity-50" })) : (_jsx(Plus, { className: "w-5 h-5 opacity-50" })) }), _jsx("p", { className: "text-sm font-medium opacity-80", children: ratingValue === 0 || ratingValue === null ? "No saved buildings" : `No ${title} buildings` }), _jsx("p", { className: "text-xs mt-1 opacity-60 max-w-[150px]", children: getGhostLabel() })] }))] })] }));
}
