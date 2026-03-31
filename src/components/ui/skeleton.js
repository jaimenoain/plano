import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
function Skeleton({ className, ...props }) {
    return _jsx("div", { className: cn("animate-pulse rounded-sm bg-surface-muted", className), ...props });
}
export { Skeleton };
