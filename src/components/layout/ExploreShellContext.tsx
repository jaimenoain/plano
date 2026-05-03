import { createContext, useContext } from "react";

/** Controls MainLayout chrome visibility from child pages. */
export type ExploreShellContextValue = {
  /** When true on `/explore`, hides MobileTopBar + AppTopNav for an immersive feed. */
  setExploreHideTopChrome: (hidden: boolean) => void;
  /** When true on `/`, hides MobileTopBar + AppTopNav so the landing page controls its own chrome. */
  setLandingHideTopChrome: (hidden: boolean) => void;
};

const ExploreShellContext = createContext<ExploreShellContextValue>({
  setExploreHideTopChrome: () => {},
  setLandingHideTopChrome: () => {},
});

export function ExploreShellProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ExploreShellContextValue;
}) {
  return (
    <ExploreShellContext.Provider value={value}>
      {children}
    </ExploreShellContext.Provider>
  );
}

export function useExploreShell() {
  return useContext(ExploreShellContext);
}
