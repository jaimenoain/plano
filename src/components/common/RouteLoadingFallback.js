import { jsx as _jsx } from "react/jsx-runtime";
import { Loader2 } from "lucide-react";
export function RouteLoadingFallback() {
    return (_jsx("div", { className: "flex h-screen w-full items-center justify-center", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-text-secondary" }) }));
}
