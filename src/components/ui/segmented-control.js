import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
export function SegmentedControl({ options, value, onValueChange, className, name }) {
    const uniqueId = React.useId();
    const layoutId = name ? `segmented-control-${name}` : `segmented-control-${uniqueId}`;
    return (_jsx("div", { className: cn("flex h-9 w-full items-center justify-center rounded-sm border border-border-default bg-surface-muted p-1 text-text-secondary", className), role: "group", children: options.map((option) => {
            const isActive = value === option.value;
            return (_jsxs("button", { onClick: () => onValueChange(option.value), className: cn("relative z-10 flex-1 px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", isActive ? "text-brand-primary-foreground" : "text-text-secondary hover:text-text-primary"), type: "button", children: [isActive && (_jsx(motion.div, { layoutId: layoutId, className: "absolute inset-0 z-[-1] rounded-sm bg-brand-primary shadow-none", transition: { type: "spring", stiffness: 300, damping: 30 } })), option.label] }, option.value));
        }) }));
}
