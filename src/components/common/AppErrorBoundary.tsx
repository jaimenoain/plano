import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureErrorBoundaryException } from "@/lib/sentry";

function AppErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-surface-default px-8 py-16 text-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-feedback-destructive" />
        <h1 className="text-2xl font-semibold text-text-primary">Something went wrong</h1>
        <p className="max-w-md text-sm text-text-secondary">
          An unexpected error occurred. Try refreshing the page.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
          <Button onClick={resetErrorBoundary}>Try again</Button>
        </div>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={AppErrorFallback}
      onError={(error, errorInfo) => {
        captureErrorBoundaryException(error, errorInfo.componentStack);
      }}
      onReset={() => {
        window.location.href = "/";
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
