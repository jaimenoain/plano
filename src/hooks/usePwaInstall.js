import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
const PwaContext = createContext(undefined);
export function PwaProvider({ children }) {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIOSDrawer, setShowIOSDrawer] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);
    const { needRefresh: [needRefresh, _setNeedRefresh], updateServiceWorker, } = useRegisterSW({
        onRegistered() { },
        onRegisterError() { },
    });
    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);
        const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches ||
            Boolean(window.navigator.standalone);
        setIsStandalone(isStandaloneMode);
        // Listen for beforeinstallprompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
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
        if (isStandalone)
            return false;
        const visits = parseInt(localStorage.getItem('pwa_visit_count') || '0', 10);
        const dismissedAt = localStorage.getItem('pwa_dismissed_at');
        const dismissedVisits = parseInt(localStorage.getItem('pwa_dismissed_visits') || '0', 10);
        if (visits < 3)
            return false;
        if (dismissedAt) {
            const dismissedDate = new Date(parseInt(dismissedAt, 10));
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - dismissedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 14)
                return false;
            if (visits < dismissedVisits + 3)
                return false;
        }
        return isInstallable || isIOS;
    };
    const promptInstall = () => {
        if (isIOS) {
            setShowIOSDrawer(true);
        }
        else if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    // User accepted
                }
                else {
                    // User dismissed
                    dismissPrompt();
                }
                setDeferredPrompt(null);
                setIsInstallable(false);
            });
        }
    };
    return (_jsx(PwaContext.Provider, { value: {
            isInstallable,
            isIOS,
            showIOSDrawer,
            setShowIOSDrawer,
            promptInstall,
            dismissPrompt,
            shouldShowPrompt,
            needRefresh,
            updateServiceWorker
        }, children: children }));
}
export function usePwaInstall() {
    const context = useContext(PwaContext);
    if (context === undefined) {
        throw new Error('usePwaInstall must be used within a PwaProvider');
    }
    return context;
}
