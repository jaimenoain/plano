import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sparkles } from "lucide-react";
export function SuggestedContentBlock({ children, suggestionReason, isSuggested, }) {
    if (!isSuggested) {
        return _jsx(_Fragment, { children: children });
    }
    return (_jsxs("div", { className: "flex flex-col gap-3 p-4 md:p-6 rounded-sm bg-brand-secondary border border-border-default mb-6 min-w-0 w-full max-w-full overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "h-3.5 w-3.5 text-brand-secondary-foreground" }), _jsxs("span", { className: "text-xs font-medium text-brand-secondary-foreground", children: ["Suggested ", suggestionReason && `• ${suggestionReason}`] })] }), _jsx("div", { className: "relative min-w-0 w-full", children: children })] }));
}
