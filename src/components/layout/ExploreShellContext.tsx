import { createContext, useContext } from "react";

/** When true on `/explore`, MainLayout hides MobileTopBar + AppTopNav for an immersive feed. */
export type ExploreShellContextValue = {
  setExploreHideTopChrome: (hidden: boolean) => void;
};

const ExploreShellContext = createContext<ExploreShellContextValue>({
  setExploreHideTopChrome: () => {},
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
