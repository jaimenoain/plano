import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { ErrorView } from "@/components/common/ErrorView";
import { captureErrorBoundaryException } from "@/lib/sentry";

function AppErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <ErrorView
      code="500"
      headline="Something broke."
      message="An unexpected error interrupted the page. A refresh usually clears it — the rest of the catalogue is still standing."
      actions={
        <>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
          <Button variant="accent" onClick={resetErrorBoundary}>
            Try again
          </Button>
        </>
      }
    />
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
