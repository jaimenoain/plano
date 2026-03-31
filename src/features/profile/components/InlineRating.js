import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { Circle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
export function InlineRating({ rating, onRate, readOnly = false }) {
    const [hoverRating, setHoverRating] = useState(null);
    const handleRate = (star) => {
        if (readOnly)
            return;
        if (rating === star) {
            onRate(null);
        }
        else {
            onRate(star);
        }
    };
    return (_jsx("div", { className: "flex items-center gap-0.5", onMouseLeave: () => setHoverRating(null), children: [1, 2, 3].map((star) => {
            const isFilled = (hoverRating !== null ? star <= hoverRating : (rating || 0) >= star);
            return (_jsx(motion.button, { type: "button", onClick: (e) => { e.stopPropagation(); handleRate(star); }, onMouseEnter: () => !readOnly && setHoverRating(star), className: cn("p-0.5 focus:outline-none transition-colors", readOnly ? "cursor-default" : "cursor-pointer"), whileTap: !readOnly ? { scale: 0.8 } : undefined, children: _jsx(motion.div, { initial: false, animate: isFilled ? { scale: [1, 1.2, 1] } : { scale: 1 }, transition: { duration: 0.2 }, children: _jsx(Circle, { className: cn("w-4 h-4 transition-colors", isFilled
                            ? "fill-brand-primary text-brand-primary"
                            : "fill-transparent text-text-secondary/20") }) }) }, star));
        }) }));
}
