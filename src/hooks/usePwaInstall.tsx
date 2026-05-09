import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** After the auto install prompt is shown, suppress it again for this long. */
const PWA_INSTALL_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const PWA_INSTALL_PROMPT_LAST_SHOWN_KEY = 'pwa_install_prompt_last_shown_at';

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
  shouldShowPrompt: () => boolean;
  markInstallPromptShown: () => void;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSDrawer, setShowIOSDrawer] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  // Register the service worker. We deliberately do NOT call `updateServiceWorker`
  // automatically: in vite-plugin-pwa it always triggers `window.location.reload()`
  // once the new worker takes control, which would interrupt the user mid-navigation.
  // With `registerType: "prompt"` the waiting worker installs in the background and
  // takes over the next time all app instances are closed.
  useRegisterSW({
    onRegistered() {},
    onRegisterError() {},
  });

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

  const markInstallPromptShown = useCallback(() => {
    localStorage.setItem(PWA_INSTALL_PROMPT_LAST_SHOWN_KEY, String(Date.now()));
  }, []);

  const shouldShowPrompt = () => {
    // Don't show prompt if already installed/standalone
    if (isStandalone) return false;

    const lastShownRaw = localStorage.getItem(PWA_INSTALL_PROMPT_LAST_SHOWN_KEY);
    if (lastShownRaw) {
      const lastShown = parseInt(lastShownRaw, 10);
      if (!Number.isNaN(lastShown) && Date.now() - lastShown < PWA_INSTALL_PROMPT_COOLDOWN_MS) {
        return false;
      }
    }

    const visits = parseInt(localStorage.getItem('pwa_visit_count') || '0', 10);
    if (visits < 3) return false;

    return isInstallable || isIOS;
  };

  const promptInstall = () => {
    if (isIOS) {
      setShowIOSDrawer(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        void choiceResult;
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
      shouldShowPrompt,
      markInstallPromptShown,
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
