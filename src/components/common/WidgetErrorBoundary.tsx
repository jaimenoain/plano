import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureErrorBoundaryException } from "@/lib/sentry";

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  name?: string;
}

function WidgetErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-muted/10 p-6 text-center">
      <AlertTriangle className="mb-2 h-6 w-6 text-text-secondary" />
      <p className="mb-3 text-sm text-text-secondary">This section couldn&apos;t load</p>
      <Button variant="ghost" size="sm" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );
}

export function WidgetErrorBoundary({ children }: WidgetErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={WidgetErrorFallback}
      onError={(error, errorInfo) => {
        captureErrorBoundaryException(error, errorInfo.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
