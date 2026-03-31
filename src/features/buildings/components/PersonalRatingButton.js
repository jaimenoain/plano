import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
export const getRatingLabel = (rating) => {
    switch (rating) {
        case 1: return "Impressive";
        case 2: return "Essential";
        case 3: return "Masterpiece";
        default: return `${rating} Circles`;
    }
};
export function PersonalRatingButton({ buildingId, initialRating, onRate, isLoading = false, label = "Rate", variant = 'popover', onOpenChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoverRating, setHoverRating] = useState(null);
    const [animatingStar, setAnimatingStar] = useState(null);
    const handleOpenChange = (open) => {
        setIsOpen(open);
        onOpenChange?.(open);
    };
    // If initialRating is provided, display it.
    const hasRated = initialRating !== null && initialRating > 0;
    const currentLabel = hoverRating
        ? getRatingLabel(hoverRating)
        : (initialRating ? getRatingLabel(initialRating) : label);
    const handleRateClick = async (star) => {
        // Trigger animation state
        setAnimatingStar(star);
        // Call the rate function
        onRate(buildingId, star);
        // If it's a high rating, play animation before closing (if in popover)
        if (star >= 2) {
            // Delay closing to let the animation play
            setTimeout(() => {
                setAnimatingStar(null);
                if (variant === 'popover') {
                    setIsOpen(false);
                }
            }, 600);
        }
        else {
            // Standard rating close immediately
            if (variant === 'popover') {
                setIsOpen(false);
            }
        }
    };
    const renderStars = () => (_jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: "flex items-center gap-1.5", onMouseLeave: () => setHoverRating(null), children: Array.from({ length: 3 }, (_, i) => i + 1).map((star) => {
                    // Fill logic: if hovering, fill up to hoverRating. If not hovering, fill up to initialRating.
                    const isFilled = (hoverRating !== null ? star <= hoverRating : (initialRating || 0) >= star);
                    const isAnimating = animatingStar === star;
                    return (_jsxs(motion.button, { type: "button", disabled: isLoading, className: `
                relative p-0.5 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2
                ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
              `, onMouseEnter: () => setHoverRating(star), onClick: () => handleRateClick(star), whileHover: { scale: 1.15 }, whileTap: { scale: 0.9 }, children: [_jsx(AnimatePresence, { children: isAnimating && (_jsx(_Fragment, { children: _jsx(motion.div, { className: "absolute inset-0 rounded-full bg-brand-primary/10", initial: { scale: 1, opacity: 0.8 }, animate: { scale: 2.5, opacity: 0 }, exit: { opacity: 0 }, transition: { duration: 0.5, ease: "easeOut" } }) })) }), _jsx(motion.div, { animate: isAnimating ? {
                                    scale: [1, 1.4, 1],
                                    transition: { duration: 0.4, type: "spring", stiffness: 300 }
                                } : {}, children: _jsx(Circle, { className: `
                      h-5 w-5 transition-colors
                      ${isFilled ? "text-brand-primary fill-brand-primary" : "text-text-disabled"}
                    ` }) })] }, star));
                }) }), _jsx("div", { className: "text-xs font-medium text-text-secondary h-4 text-center w-full", children: currentLabel })] }));
    if (variant === 'inline') {
        return renderStars();
    }
    return (_jsxs(Popover, { open: isOpen, onOpenChange: handleOpenChange, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx(Button, { variant: hasRated ? "default" : "ghost", size: "sm", className: `
            h-8 transition-all gap-1.5
            ${hasRated
                        ? "bg-brand-primary/10 hover:bg-brand-primary/20 text-[#595959] hover:text-[#595959] border-brand-primary/20 border"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"}
          `, children: hasRated ? (_jsxs(_Fragment, { children: [_jsx(Circle, { className: "w-3.5 h-3.5 fill-[#595959]" }), _jsxs("span", { className: "font-bold", children: [initialRating, "/3"] })] })) : (_jsx("span", { className: "text-xs", children: label })) }) }), _jsx(PopoverContent, { className: "w-auto p-3", align: "center", sideOffset: 5, children: renderStars() })] }));
}
