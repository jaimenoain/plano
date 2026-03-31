import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
export function AllCaughtUpDivider() {
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.5, ease: "easeOut" }, className: "relative flex items-center justify-center w-full", children: [_jsx("div", { className: "w-full border-t border-border-default" }), _jsxs("div", { className: "absolute -translate-y-1/2 px-4 bg-surface-default flex items-center gap-2", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-text-secondary" }), _jsx("span", { className: "text-xs font-medium text-text-secondary uppercase tracking-wide", children: "You're all caught up" })] })] }));
}
