import type { ReactNode } from "react";

import useIsClient from "@/hooks/useIsClient";

/**
 * SSR guard: renders `fallback` on the server and until the first browser mount, then renders
 * `children`. Use for subtrees that depend on `window`, WebGL, or other APIs that must not run
 * during React Router server rendering.
 */
type ClientOnlyProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const isClient = useIsClient();

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
