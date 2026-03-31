import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureErrorBoundaryException } from "@/lib/sentry";
function AppErrorFallback({ resetErrorBoundary }) {
    return (_jsx("div", { className: "flex h-screen w-full flex-col items-center justify-center bg-surface-default px-8 py-16 text-center", children: _jsxs("div", { className: "flex flex-col items-center justify-center gap-4", children: [_jsx(AlertTriangle, { className: "h-12 w-12 text-feedback-destructive" }), _jsx("h1", { className: "text-2xl font-semibold text-text-primary", children: "Something went wrong" }), _jsx("p", { className: "max-w-md text-sm text-text-secondary", children: "An unexpected error occurred. Try refreshing the page." }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "outline", onClick: () => window.location.reload(), children: "Refresh page" }), _jsx(Button, { onClick: resetErrorBoundary, children: "Try again" })] })] }) }));
}
export function AppErrorBoundary({ children }) {
    return (_jsx(ErrorBoundary, { FallbackComponent: AppErrorFallback, onError: (error, errorInfo) => {
            captureErrorBoundaryException(error, errorInfo.componentStack);
        }, onReset: () => {
            window.location.href = "/";
        }, children: children }));
}
