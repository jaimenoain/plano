import React from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MapErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-muted/10 p-4 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
      <h3 className="mb-2 text-lg font-semibold">Map Unavailable</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Something went wrong while loading the map.
      </p>
      <Button variant="outline" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );
};

export const MapErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary
      FallbackComponent={MapErrorFallback}
      onReset={() => {
        // Optional: Add logic to clear caches or similar if needed
        console.log("Retrying map render...");
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
