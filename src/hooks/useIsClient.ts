import { useEffect, useState } from "react";

/**
 * Returns `false` on the server and on the first client render, then `true` after mount.
 *
 * Use this to guard browser-only APIs during React Router SSR: `useEffect` does not run in
 * Node, so the value stays `false` until hydration. Do **not** substitute
 * `typeof window !== "undefined"` — that can be true during SSR in some Vite/Vercel setups.
 * For UI trees, prefer the `ClientOnly` component in `@/components/common/ClientOnly`.
 */
export default function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
