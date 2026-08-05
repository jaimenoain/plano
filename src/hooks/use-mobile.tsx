import * as React from "react";

/** Must match Tailwind `md` (768px) so `Sidebar` sheet vs desktop panel stay in sync. */
const MOBILE_BREAKPOINT = 768;

/**
 * True below `breakpoint`. The default is Tailwind `md`; pass another when the
 * layout being matched switches somewhere else (e.g. a `lg:` container, where
 * assuming 768 leaves a dead band between 768 and 1024).
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!isMobile;
}
