import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureErrorBoundaryException } from '@/lib/sentry';
const MapErrorFallback = ({ error: _error, resetErrorBoundary }) => {
    return (_jsxs("div", { className: "flex h-full w-full flex-col items-center justify-center bg-surface-muted/10 p-4 text-center", children: [_jsx(AlertTriangle, { className: "mb-4 h-10 w-10 text-feedback-destructive" }), _jsx("h3", { className: "mb-2 text-lg font-semibold", children: "Map Unavailable" }), _jsx("p", { className: "mb-4 text-sm text-text-secondary", children: "Something went wrong while loading the map." }), _jsx(Button, { variant: "outline", onClick: resetErrorBoundary, children: "Retry" })] }));
};
export const MapErrorBoundary = ({ children }) => {
    return (_jsx(ErrorBoundary, { FallbackComponent: MapErrorFallback, onError: (error, errorInfo) => {
            captureErrorBoundaryException(error, errorInfo.componentStack);
        }, onReset: () => { }, children: children }));
};
