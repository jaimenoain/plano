/* eslint-disable no-console -- Monkey-patches console methods for captured diagnostics; must reference console. */
import { useEffect } from "react";

export const capturedErrors: string[] = [];

function push(entry: string) {
  capturedErrors.unshift(entry);
  if (capturedErrors.length > 20) capturedErrors.length = 20;
}

export function ConsoleErrorInterceptor() {
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: unknown[]) => {
      push(
        "[error] " +
          args
            .map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a)))
            .join(" ")
      );
      originalError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      push(
        "[warn] " +
          args
            .map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a)))
            .join(" ")
      );
      originalWarn.apply(console, args);
    };

    const handleError = (event: ErrorEvent) => {
      const msg = event.error instanceof Error
        ? `${event.error.name}: ${event.error.message}`
        : event.message || "Unknown error";
      push(`[uncaught] ${msg}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error
        ? `${event.reason.name}: ${event.reason.message}`
        : String(event.reason ?? "Unknown rejection");
      push(`[unhandledrejection] ${reason}`);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
