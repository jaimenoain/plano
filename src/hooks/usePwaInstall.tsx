import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  needRefresh: boolean;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSDrawer, setShowIOSDrawer] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  });

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect Standalone
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
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
      needRefresh,
      updateServiceWorker
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
