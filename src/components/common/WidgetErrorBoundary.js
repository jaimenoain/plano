import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureErrorBoundaryException } from "@/lib/sentry";
function WidgetErrorFallback({ resetErrorBoundary }) {
    return (_jsxs("div", { className: "flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-muted/10 p-6 text-center", children: [_jsx(AlertTriangle, { className: "mb-2 h-6 w-6 text-text-secondary" }), _jsx("p", { className: "mb-3 text-sm text-text-secondary", children: "This section couldn't load" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: resetErrorBoundary, children: "Retry" })] }));
}
export function WidgetErrorBoundary({ children }) {
    return (_jsx(ErrorBoundary, { FallbackComponent: WidgetErrorFallback, onError: (error, errorInfo) => {
            captureErrorBoundaryException(error, errorInfo.componentStack);
        }, children: children }));
}
