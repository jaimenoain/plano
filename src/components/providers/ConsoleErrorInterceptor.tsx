import { useEffect } from "react";

export const capturedErrors: string[] = [];

export function ConsoleErrorInterceptor() {
  useEffect(() => {
    const original = console.error;

    console.error = (...args: unknown[]) => {
      const formatted = args
        .map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a)))
        .join(" ");
      capturedErrors.unshift(formatted);
      if (capturedErrors.length > 10) capturedErrors.length = 10;
      original.apply(console, args);
    };

    return () => {
      console.error = original;
    };
  }, []);

  return null;
}
