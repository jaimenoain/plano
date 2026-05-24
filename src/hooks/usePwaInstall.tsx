import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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

  // Shared reload guard — set to true before the first reload to prevent concurrent
  // triggers (updatefound, controllerchange, and version-check can all fire at once).
  const reloading = useRef(false);

  // ─── Layer 1: updatefound + statechange ────────────────────────────────────
  // When a new SW finishes installing and transitions to 'activated', reload.
  // This fires regardless of whether clientsClaim() is called, making it more
  // reliable than controllerchange alone. Captured in onRegistered so it is wired
  // directly to the registration object before any update check runs.
  const { updateServiceWorker } = useRegisterSW({
    onRegistered(reg) {
      if (!reg) return;
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;
        // Snapshot controller at the moment updatefound fires. If there was already
        // an active SW (i.e. this is an upgrade, not first install) we reload.
        const hadController = Boolean(navigator.serviceWorker.controller);
        newSW.addEventListener("statechange", () => {
          if (newSW.state === "activated" && hadController && !reloading.current) {
            reloading.current = true;
            window.location.reload();
          }
        });
      });
    },
    onRegisterError() {},
    // onNeedRefresh is only called in 'prompt' mode; kept as a safety net in case
    // registerType is ever switched away from 'autoUpdate'.
    onNeedRefresh() {
      void updateServiceWorker(true);
    },
  });

  // ─── Layer 2: controllerchange + Layer 3: version poll ─────────────────────
  // controllerchange: backup for when the new SW calls clientsClaim() on open tabs
  // without the updatefound path catching it first.
  //
  // Version poll: hits /api/version (no-store, SSR, never cached by the SW) and
  // reloads if the server version differs from the build-time constant. This is the
  // ultimate fallback — it works even for users stuck on old code that has no
  // updatefound or controllerchange listener, as long as a newer deployment of this
  // file has since been served at least once to that device.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (hadController && !reloading.current) {
        reloading.current = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let lastVersionCheckAt = 0;
    const checkVersion = () => {
      const now = Date.now();
      if (now - lastVersionCheckAt < 5 * 60 * 1000) return; // at most once per 5 min
      lastVersionCheckAt = now;
      void fetch("/api/version", { cache: "no-store" })
        .then((res) => res.json() as Promise<{ buildId: string }>)
        .then(({ buildId }) => {
          if (buildId && buildId !== __BUILD_ID__ && !reloading.current) {
            reloading.current = true;
            window.location.reload();
          }
        })
        .catch(() => {
          // Best-effort — ignore offline / transient errors
        });
    };

    const checkForUpdate = () => {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        void reg?.update();
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
        checkVersion();
      }
    };

    void navigator.serviceWorker.ready.then(() => {
      checkForUpdate();
      checkVersion();
    });

    document.addEventListener("visibilitychange", onVisibility);
    const intervalId = window.setInterval(() => {
      checkForUpdate();
      checkVersion();
    }, 60 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
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
