import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
export const ArchitectStatement = ({ statement, isEditing, onChange, className }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showReadMore, setShowReadMore] = useState(false);
    const textRef = useRef(null);
    useEffect(() => {
        const checkOverflow = () => {
            const el = textRef.current;
            if (el && !isExpanded) {
                setShowReadMore(el.scrollHeight > el.clientHeight);
            }
        };
        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [statement, isExpanded]);
    if (!statement && !isEditing)
        return null;
    return (_jsx("div", { className: `space-y-3 ${className || ""}`, children: _jsxs("div", { className: "bg-brand-secondary border border-border-default rounded-sm p-6", children: [_jsx("h3", { className: "text-xs font-medium text-brand-secondary-foreground uppercase tracking-wide mb-3", children: "Architect's Statement" }), isEditing ? (_jsx(Textarea, { value: statement, onChange: (e) => onChange(e.target.value), placeholder: "Write the architect's statement here...", className: "min-h-[150px] text-base leading-relaxed italic resize-y bg-surface-default" })) : (_jsxs("div", { children: [_jsx("p", { ref: textRef, className: `text-base leading-relaxed italic text-text-primary/90 whitespace-pre-wrap ${!isExpanded ? "line-clamp-5" : ""}`, children: statement }), (showReadMore || isExpanded) && (_jsx("button", { onClick: () => setIsExpanded(!isExpanded), className: "mt-3 text-sm text-text-secondary hover:text-text-primary font-medium hover:underline focus:outline-none", children: isExpanded ? "Read less" : "Read more" }))] }))] }) }));
};
