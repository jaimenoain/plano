import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { ErrorView } from "@/components/common/ErrorView";
import { captureErrorBoundaryException } from "@/lib/sentry";

function RouteErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <ErrorView
      code="500"
      headline="This section broke."
      message="Something went wrong loading this content. The rest of the app should still work."
      heightClassName="h-[60vh]"
      actions={
        <>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
          <Button variant="accent" onClick={resetErrorBoundary}>
            Retry
          </Button>
        </>
      }
    />
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
