import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
function FavoritePoster({ fav, className, onClick }) {
    return (_jsxs("button", { type: "button", className: cn("flex flex-col items-start gap-1 w-32 text-left group cursor-pointer", className), onClick: onClick, children: [_jsx("div", { className: "aspect-square w-full rounded-sm overflow-hidden bg-surface-muted border border-border-default shadow-none", children: fav.image_url ? (_jsx("img", { src: fav.image_url, className: "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105", alt: fav.title })) : (_jsx("div", { className: "h-full w-full bg-surface-muted" })) }), _jsx("span", { className: "text-xs font-medium text-text-primary truncate w-full", children: fav.title })] }));
}
export function FavoritesSection({ favorites, isOwnProfile, onManage }) {
    const navigate = useNavigate();
    if (favorites.length === 0) {
        if (!isOwnProfile)
            return null;
        return (_jsxs("div", { className: "px-4 py-6", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(Heart, { className: "h-4 w-4 text-brand-primary fill-brand-primary" }), _jsx("h3", { className: "text-sm font-semibold text-text-primary", children: "All-time Favourites" })] }), _jsxs("button", { type: "button", onClick: onManage, className: "w-full border-2 border-dashed border-border-default/50 rounded-sm p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-muted/20 transition-colors group", children: [_jsx("div", { className: "w-12 h-12 bg-surface-muted/30 rounded-sm flex items-center justify-center mb-3 group-hover:bg-brand-primary/20 transition-colors", children: _jsx(Plus, { className: "h-6 w-6 text-text-secondary group-hover:text-brand-primary transition-colors" }) }), _jsx("p", { className: "text-text-secondary font-medium group-hover:text-text-primary transition-colors", children: "Add here your top 6 favourite buildings" })] })] }));
    }
    const handleNavigate = (fav) => {
        if (fav.reviewId) {
            navigate(`/review/${fav.reviewId}`);
        }
        else {
            navigate(`/building/${fav.id}`);
        }
    };
    return (_jsxs("div", { className: "px-4 py-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Heart, { className: "h-4 w-4 text-brand-primary fill-brand-primary" }), _jsx("h3", { className: "text-sm font-semibold text-text-primary", children: "All-time Favourites" })] }), isOwnProfile && (_jsx(Button, { variant: "ghost", size: "sm", onClick: onManage, className: "text-xs h-auto p-0 text-text-secondary hover:text-brand-primary", children: "Edit" }))] }), _jsxs("div", { className: "md:hidden relative group", children: [_jsxs(ScrollArea, { className: "w-full whitespace-nowrap -mx-4 pb-4", children: [_jsx("div", { className: "flex space-x-4 px-4 pr-12", children: favorites.map((fav) => (_jsx(FavoritePoster, { fav: fav, className: "shrink-0", onClick: () => handleNavigate(fav) }, `${fav.media_type}-${fav.id}`))) }), _jsx(ScrollBar, { orientation: "horizontal", className: "invisible" })] }), _jsx("div", { className: "absolute top-0 right-[-1rem] bottom-4 w-12 bg-gradient-to-l from-surface-default to-transparent pointer-events-none z-10" })] }), _jsx("div", { className: "hidden md:grid grid-cols-6 gap-4", children: favorites.map((fav) => (_jsx(FavoritePoster, { fav: fav, className: "w-full", onClick: () => handleNavigate(fav) }, `${fav.media_type}-${fav.id}`))) })] }));
}
