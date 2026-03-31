import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PencilRuler } from "lucide-react";
export function ArchitectSearchNudge({ architects, onSingleMatch, onMultipleMatch }) {
    if (architects.length === 0)
        return null;
    if (architects.length === 1) {
        const architect = architects[0];
        return (_jsx("div", { className: "px-4 py-2 animate-in fade-in slide-in-from-top-2", children: _jsx(Card, { className: "bg-brand-secondary rounded-sm border border-border-default hover:bg-brand-secondary transition-colors cursor-pointer group", onClick: () => onSingleMatch(architect.id), children: _jsxs(CardContent, { className: "flex items-center gap-3 p-4", children: [_jsx("div", { className: "h-8 w-8 rounded-sm bg-surface-muted border border-border-default flex items-center justify-center", children: _jsx(PencilRuler, { className: "h-4 w-4 text-text-secondary" }) }), _jsx("div", { className: "flex-1", children: _jsxs("p", { className: "text-sm font-medium text-text-primary", children: ["Looking for", " ", _jsx("span", { className: "text-brand-primary font-semibold group-hover:underline", children: architect.name }), "?"] }) }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-8 text-xs text-text-secondary group-hover:text-text-primary", children: "View Portfolio" })] }) }) }));
    }
    // Multiple matches
    return (_jsx("div", { className: "px-4 py-2 animate-in fade-in slide-in-from-top-2", children: _jsx(Card, { className: "bg-brand-secondary rounded-sm border border-border-default hover:bg-brand-secondary transition-colors cursor-pointer group", onClick: onMultipleMatch, children: _jsxs(CardContent, { className: "flex items-center gap-3 p-4", children: [_jsx("div", { className: "flex -space-x-2 overflow-hidden pl-1", children: architects.slice(0, 3).map((arch) => (_jsx("div", { className: "inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-default ring-2 ring-surface-default border", children: _jsx(PencilRuler, { className: "h-3 w-3 text-text-secondary" }) }, arch.id))) }), _jsx("div", { className: "flex-1", children: _jsxs("p", { className: "text-sm font-medium text-text-primary", children: [architects.length, " architects found matching your search"] }) }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-8 text-xs text-text-secondary group-hover:text-text-primary", children: "View All" })] }) }) }));
}
