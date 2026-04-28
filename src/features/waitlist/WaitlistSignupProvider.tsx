import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { WaitingListDialog } from "./components/WaitingListDialog";

type WaitlistSignupContextValue = {
  openWaitlistDialog: () => void;
};

const WaitlistSignupContext = createContext<WaitlistSignupContextValue | null>(null);

export function WaitlistSignupProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openWaitlistDialog = useCallback(() => {
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      openWaitlistDialog,
    }),
    [openWaitlistDialog],
  );

  return (
    <WaitlistSignupContext.Provider value={value}>
      {children}
      <WaitingListDialog open={open} onOpenChange={setOpen} />
    </WaitlistSignupContext.Provider>
  );
}

export function useWaitlistSignup(): WaitlistSignupContextValue {
  const ctx = useContext(WaitlistSignupContext);
  if (!ctx) {
    throw new Error("useWaitlistSignup must be used within WaitlistSignupProvider");
  }
  return ctx;
}
