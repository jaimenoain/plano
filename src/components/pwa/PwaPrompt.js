import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Share, SquarePlus } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, } from '@/components/ui/drawer';
export function PwaPrompt() {
    const { promptInstall, dismissPrompt, shouldShowPrompt, showIOSDrawer, setShowIOSDrawer, isIOS } = usePwaInstall();
    // Use a ref to access the latest state/functions inside the effect
    // without re-triggering the timer or event listeners.
    const stateRef = useRef({
        shouldShowPrompt,
        promptInstall,
        dismissPrompt,
        isIOS,
        setShowIOSDrawer
    });
    // Keep the ref updated with the latest values
    useEffect(() => {
        stateRef.current = {
            shouldShowPrompt,
            promptInstall,
            dismissPrompt,
            isIOS,
            setShowIOSDrawer
        };
    }, [shouldShowPrompt, promptInstall, dismissPrompt, isIOS, setShowIOSDrawer]);
    useEffect(() => {
        const showUi = () => {
            const { shouldShowPrompt, isIOS, setShowIOSDrawer, promptInstall, dismissPrompt } = stateRef.current;
            if (shouldShowPrompt()) {
                if (isIOS) {
                    setShowIOSDrawer(true);
                }
                else {
                    // Check if toast is already active to avoid duplicates
                    // (Sonner handles this by ID, but good to be explicit)
                    toast.custom((t) => (_jsxs("div", { className: "bg-surface-default border border-border-default p-4 rounded-lg shadow-lg flex flex-col gap-3 w-full max-w-sm pointer-events-auto", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("h3", { className: "font-semibold text-text-primary", children: "Install PLANO" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Install our app for the best experience." })] }), _jsxs("div", { className: "flex items-center gap-2 justify-end", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
                                            dismissPrompt();
                                            toast.dismiss(t);
                                        }, children: "Not Now" }), _jsx(Button, { size: "sm", onClick: () => {
                                            promptInstall();
                                            toast.dismiss(t);
                                        }, children: "Install" })] })] })), {
                        duration: Infinity, // Don't auto-dismiss
                        id: 'pwa-install-prompt',
                        position: 'bottom-center' // Or default
                    });
                }
            }
        };
        // 1. Backstop Timer (60 seconds)
        const timer = setTimeout(() => {
            showUi();
        }, 60000);
        // 2. Interaction Listener
        const handleInteraction = () => {
            showUi();
        };
        window.addEventListener('pwa-interaction', handleInteraction);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('pwa-interaction', handleInteraction);
        };
    }, []); // Empty dependency array ensures this runs once on mount
    return (_jsx(Drawer, { open: showIOSDrawer, onOpenChange: setShowIOSDrawer, children: _jsx(DrawerContent, { children: _jsxs("div", { className: "mx-auto w-full max-w-sm", children: [_jsxs(DrawerHeader, { children: [_jsx(DrawerTitle, { children: "Install PLANO" }), _jsx(DrawerDescription, { children: "Add to your Home Screen for the best experience." })] }), _jsxs("div", { className: "p-4 flex flex-col gap-6", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "bg-surface-muted p-3 rounded-xl", children: _jsx(Share, { className: "w-6 h-6 text-text-primary" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium", children: "1. Tap the Share button" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Usually at the bottom of the screen" })] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "bg-surface-muted p-3 rounded-xl", children: _jsx(SquarePlus, { className: "w-6 h-6 text-text-primary" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium", children: "2. Select 'Add to Home Screen'" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Scroll down to find it" })] })] })] }), _jsx(DrawerFooter, { children: _jsx(DrawerClose, { asChild: true, children: _jsx(Button, { variant: "outline", children: "Close" }) }) })] }) }) }));
}
