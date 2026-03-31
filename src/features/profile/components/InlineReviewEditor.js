import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip";
export function InlineReviewEditor({ initialContent, isOwnProfile, onSave }) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(initialContent || "");
    const [isSaving, setIsSaving] = useState(false);
    // Update content if initialContent changes (e.g. from props)
    useEffect(() => {
        setContent(initialContent || "");
    }, [initialContent]);
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(content);
            setIsEditing(false);
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleCancel = () => {
        setContent(initialContent || "");
        setIsEditing(false);
    };
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            handleCancel();
        }
        // Optional: Allow saving with Ctrl+Enter or Cmd+Enter
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            handleSave();
        }
    };
    if (isEditing) {
        return (_jsxs("div", { className: "flex flex-col gap-2 min-w-[200px] py-1", children: [_jsx(Textarea, { value: content, onChange: (e) => setContent(e.target.value), placeholder: "Write a review...", className: "min-h-[80px] text-xs resize-none bg-surface-muted border border-border-default rounded-sm z-10 relative", autoFocus: true, onKeyDown: handleKeyDown, onClick: (e) => e.stopPropagation() }), _jsxs("div", { className: "flex items-center gap-2", onClick: (e) => e.stopPropagation(), children: [_jsxs(Button, { size: "sm", className: "h-6 text-xs px-2", onClick: handleSave, disabled: isSaving, children: [isSaving ? _jsx(Loader2, { className: "h-3 w-3 animate-spin mr-1" }) : _jsx(Check, { className: "h-3 w-3 mr-1" }), "Save"] }), _jsxs(Button, { variant: "ghost", size: "sm", className: "h-6 text-xs px-2", onClick: handleCancel, disabled: isSaving, children: [_jsx(X, { className: "h-3 w-3 mr-1" }), "Cancel"] })] })] }));
    }
    return (_jsxs("div", { className: "flex items-center group min-h-[20px] max-w-full", children: [_jsx("div", { className: "flex-1 min-w-0 truncate", children: content ? (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("span", { className: "truncate block cursor-default", children: content }) }), _jsx(TooltipContent, { className: "max-w-sm text-xs z-50", children: _jsx("p", { className: "whitespace-normal break-words", children: content }) })] })) : (isOwnProfile ? (_jsx("span", { className: "text-text-secondary/50 italic text-[10px] cursor-pointer hover:text-text-primary/80 transition-colors", onClick: (e) => { e.stopPropagation(); setIsEditing(true); }, children: "Add a review..." })) : ("—")) }), isOwnProfile && (_jsx(Button, { variant: "ghost", size: "icon", className: "h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-surface-muted", onClick: (e) => { e.stopPropagation(); setIsEditing(true); }, title: "Edit review", children: _jsx(Pencil, { className: "h-3 w-3 text-text-secondary" }) }))] }));
}
