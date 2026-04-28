import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Define the event interface
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextType {
  isInstallable: boolean;
  isIOS: boolean;
  showIOSDrawer: boolean;
  setShowIOSDrawer: (show: boolean) => void;
  promptInstall: () => void;
  dismissPrompt: () => void;
  shouldShowPrompt: () => boolean;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSDrawer, setShowIOSDrawer] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered() {},
    onRegisterError() {},
  });

  useEffect(() => {
    if (!needRefresh) {
      toast.dismiss('pwa-sw-update');
      return;
    }
    toast.info('A new version of Plano is ready', {
      id: 'pwa-sw-update',
      description: 'Refresh when you are finished to avoid losing work in progress.',
      duration: 600_000,
      action: {
        label: 'Refresh now',
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
    });
  }, [needRefresh, updateServiceWorker]);

  // Long-lived installed PWAs (especially mobile) may not re-check the service worker
  // until a cold start. Probing on resume + periodically helps them pick up new sw.js
  // (also pair with `Cache-Control` on `/sw.js` in vercel.json so the check is not stale).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const checkForUpdate = () => {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        void reg?.update();
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    void navigator.serviceWorker.ready.then(() => {
      checkForUpdate();
    });

    document.addEventListener("visibilitychange", onVisibility);
    const intervalId = window.setInterval(checkForUpdate, 60 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect Standalone (iOS Safari exposes `navigator.standalone`)
    interface NavigatorStandalone extends Navigator {
      standalone?: boolean;
    }
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as NavigatorStandalone).standalone);
    setIsStandalone(isStandaloneMode);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Track visits logic remains the same
  useEffect(() => {
    const hasSession = sessionStorage.getItem('pwa_session');
    if (!hasSession) {
      sessionStorage.setItem('pwa_session', 'true');
      const visits = parseInt(localStorage.getItem('pwa_visit_count') || '0', 10);
      localStorage.setItem('pwa_visit_count', (visits + 1).toString());
    }
  }, []);

  const dismissPrompt = () => {
    const currentVisits = parseInt(localStorage.getItem('pwa_visit_count') || '0', 10);
    localStorage.setItem('pwa_dismissed_at', Date.now().toString());
    localStorage.setItem('pwa_dismissed_visits', currentVisits.toString());
  };

  const shouldShowPrompt = () => {
    // Don't show prompt if already installed/standalone
    if (isStandalone) return false;

    const visits = parseInt(localStorage.getItem('pwa_visit_count') || '0', 10);
    const dismissedAt = localStorage.getItem('pwa_dismissed_at');
    const dismissedVisits = parseInt(localStorage.getItem('pwa_dismissed_visits') || '0', 10);

    if (visits < 3) return false;

    if (dismissedAt) {
      const dismissedDate = new Date(parseInt(dismissedAt, 10));
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dismissedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 14) return false;
      if (visits < dismissedVisits + 3) return false;
    }

    return isInstallable || isIOS;
  };

  const promptInstall = () => {
    if (isIOS) {
      setShowIOSDrawer(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          // User accepted
        } else {
          // User dismissed
          dismissPrompt();
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
      });
    }
  };

  return (
    <PwaContext.Provider value={{
      isInstallable,
      isIOS,
      showIOSDrawer,
      setShowIOSDrawer,
      promptInstall,
      dismissPrompt,
      shouldShowPrompt,
    }}>
      {children}
    </PwaContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(PwaContext);
  if (context === undefined) {
    throw new Error('usePwaInstall must be used within a PwaProvider');
  }
  return context;
}
