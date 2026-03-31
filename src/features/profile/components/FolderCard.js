import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
export function FolderCard({ folder, to, onClick, className, isDroppable = false }) {
    const { isOver, setNodeRef } = useDroppable({
        id: `folder-${folder.id}`,
        data: { type: "folder", folder },
        disabled: !isDroppable,
    });
    const content = (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute inset-0 bg-surface-card border rounded-lg transform -rotate-2 translate-x-0.5 translate-y-1.5 transition-transform group-hover:-rotate-3 group-hover:translate-x-1 group-hover:translate-y-2 -z-20" }), _jsx("div", { className: "absolute inset-0 bg-surface-card border rounded-lg transform rotate-2 translate-x-1 translate-y-1 transition-transform group-hover:rotate-3 group-hover:translate-x-1.5 group-hover:translate-y-1.5 -z-10" }), _jsx(Card, { ref: setNodeRef, className: cn("h-[100px] bg-surface-card hover:border-brand-primary/50 transition-all relative overflow-hidden shadow-none", isOver && "border-brand-primary ring-2 ring-brand-primary/40 bg-surface-muted/80 scale-105 z-20"), children: _jsxs(CardContent, { className: "p-3 h-full flex flex-col justify-between relative z-10 pointer-events-none", children: [_jsxs("div", { className: "flex justify-between items-start gap-2", children: [_jsx("h4", { className: "font-medium text-sm line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors whitespace-normal flex-1", children: folder.name }), folder.is_public ? (_jsx(Globe, { className: "h-3 w-3 text-text-secondary shrink-0 mt-0.5" })) : (_jsx(Lock, { className: "h-3 w-3 text-text-secondary shrink-0 mt-0.5" }))] }), _jsxs("div", { className: "flex items-end justify-between mt-auto", children: [_jsxs("span", { className: "text-xs text-text-secondary font-medium flex items-center gap-1.5", children: [_jsx(Folder, { className: "h-3.5 w-3.5" }), folder.items_count || 0] }), folder.preview_images && folder.preview_images.length > 0 ? (_jsxs("div", { className: "grid grid-cols-2 gap-0.5 w-8 h-8 rounded overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity", children: [folder.preview_images.slice(0, 4).map((img, i) => (_jsx("img", { src: img, alt: "", className: "w-full h-full object-cover" }, i))), folder.preview_images.length < 4 && Array.from({ length: 4 - folder.preview_images.length }).map((_, i) => (_jsx("div", { className: "bg-surface-muted" }, `placeholder-${i}`)))] })) : (_jsx("div", { className: "w-8 h-8 flex items-center justify-center bg-surface-muted/50 rounded text-text-secondary/50", children: _jsx(Folder, { className: "h-4 w-4" }) }))] })] }) })] }));
    const containerClasses = cn("block group relative select-none w-[180px] isolate", className);
    if (to) {
        return (_jsx(Link, { to: to, className: containerClasses, onClick: onClick, children: content }));
    }
    return (_jsx("div", { className: containerClasses, onClick: onClick, children: content }));
}
