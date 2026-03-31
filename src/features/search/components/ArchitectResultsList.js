import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Skeleton } from "@/components/ui/skeleton";
import { PencilRuler, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
export function ArchitectResultsList({ architects, isLoading }) {
    const navigate = useNavigate();
    if (isLoading) {
        return (_jsx("div", { className: "flex flex-col gap-2 p-4", children: [...Array(5)].map((_, i) => (_jsxs("div", { className: "flex items-center gap-3 p-3", children: [_jsx(Skeleton, { className: "h-10 w-10 rounded-full" }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Skeleton, { className: "h-4 w-32" }), _jsx(Skeleton, { className: "h-3 w-20" })] })] }, i))) }));
    }
    if (architects.length === 0) {
        return (_jsx("div", { className: "flex flex-col items-center justify-center p-8 text-center text-text-secondary", children: _jsx("p", { children: "No architects found matching your search." }) }));
    }
    return (_jsx("div", { className: "flex flex-col p-4", children: architects.map((architect) => (_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border-default hover:bg-brand-secondary transition-colors cursor-pointer group", onClick: () => navigate(`/architect/${architect.id}`), children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-10 w-10 rounded-full bg-surface-muted flex items-center justify-center border", children: _jsx(PencilRuler, { className: "h-5 w-5 text-text-secondary group-hover:text-text-primary transition-colors" }) }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "font-medium text-sm", children: architect.name }), _jsx("span", { className: "text-xs text-text-secondary capitalize", children: architect.type })] })] }), _jsx(ChevronRight, { className: "h-4 w-4 text-text-secondary/50 group-hover:text-text-primary transition-colors" })] }, architect.id))) }));
}
