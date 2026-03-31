import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
export function MichelinRatingInput({ value, onChange, className, disabled }) {
    const [hovered, setHovered] = React.useState(null);
    return (_jsx("div", { className: cn("flex gap-4 items-center", className), children: [1, 2, 3].map((rating) => {
            const isActive = hovered !== null ? rating <= hovered : rating <= value;
            return (_jsx(motion.button, { type: "button", disabled: disabled, whileTap: { scale: 0.9 }, onClick: () => {
                    if (disabled)
                        return;
                    if (value === rating) {
                        onChange(0);
                    }
                    else {
                        onChange(rating);
                    }
                }, onMouseEnter: () => !disabled && setHovered(rating), onMouseLeave: () => !disabled && setHovered(null), className: "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-sm hover:bg-surface-muted transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary", children: _jsx(RatingCircle, { active: isActive }) }, rating));
        }) }));
}
function RatingCircle({ active }) {
    return (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "48", height: "48", viewBox: "0 0 24 24", className: cn("transition-colors duration-200", active
            ? "fill-brand-primary stroke-brand-primary"
            : "fill-transparent stroke-text-disabled"), strokeLinecap: "round", strokeLinejoin: "round", style: { strokeWidth: 1.5 }, children: _jsx("circle", { cx: "12", cy: "12", r: "10" }) }));
}
