import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
export function SearchModeToggle({ mode, onModeChange, className, }) {
    return (_jsxs("div", { className: cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center bg-surface-card border border-border-default shadow-md rounded-sm p-1", className), children: [_jsxs(Button, { variant: mode === "map" ? "secondary" : "ghost", size: "sm", className: cn("rounded-sm px-4 gap-2 transition-all", mode === "map" && "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"), onClick: () => onModeChange("map"), children: [_jsx(MapIcon, { className: "h-4 w-4" }), _jsx("span", { className: "font-medium", children: "Map" })] }), _jsxs(Button, { variant: mode === "list" ? "secondary" : "ghost", size: "sm", className: cn("rounded-sm px-4 gap-2 transition-all", mode === "list" && "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"), onClick: () => onModeChange("list"), children: [_jsx(List, { className: "h-4 w-4" }), _jsx("span", { className: "font-medium", children: "List" })] })] }));
}
