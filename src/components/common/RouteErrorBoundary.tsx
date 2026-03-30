import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureErrorBoundaryException } from "@/lib/sentry";

function RouteErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center bg-surface-default px-8 py-16 text-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-feedback-destructive" />
        <h2 className="text-xl font-semibold text-text-primary">This page encountered an error</h2>
        <p className="max-w-md text-sm text-text-secondary">
          Something went wrong loading this content. The rest of the app should still work.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
          <Button onClick={resetErrorBoundary}>Retry</Button>
        </div>
      </div>
    </div>
  );
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={RouteErrorFallback}
      onError={(error, errorInfo) => {
        captureErrorBoundaryException(error, errorInfo.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
