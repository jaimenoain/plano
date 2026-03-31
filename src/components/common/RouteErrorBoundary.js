import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureErrorBoundaryException } from "@/lib/sentry";
function RouteErrorFallback({ resetErrorBoundary }) {
    return (_jsx("div", { className: "flex h-[60vh] w-full flex-col items-center justify-center bg-surface-default px-8 py-16 text-center", children: _jsxs("div", { className: "flex flex-col items-center justify-center gap-4", children: [_jsx(AlertTriangle, { className: "h-12 w-12 text-feedback-destructive" }), _jsx("h2", { className: "text-xl font-semibold text-text-primary", children: "This page encountered an error" }), _jsx("p", { className: "max-w-md text-sm text-text-secondary", children: "Something went wrong loading this content. The rest of the app should still work." }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "outline", onClick: () => window.history.back(), children: "Go back" }), _jsx(Button, { onClick: resetErrorBoundary, children: "Retry" })] })] }) }));
}
export function RouteErrorBoundary({ children }) {
    return (_jsx(ErrorBoundary, { FallbackComponent: RouteErrorFallback, onError: (error, errorInfo) => {
            captureErrorBoundaryException(error, errorInfo.componentStack);
        }, children: children }));
}
