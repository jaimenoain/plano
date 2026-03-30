import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

function RouteErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
      <h2 className="mb-2 text-xl font-semibold">This page encountered an error</h2>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">
        Something went wrong loading this content. The rest of the app should still work.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button onClick={resetErrorBoundary}>Retry</Button>
      </div>
    </div>
  );
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={RouteErrorFallback}>{children}</ErrorBoundary>
  );
}
