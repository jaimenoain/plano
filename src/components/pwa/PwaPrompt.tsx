import { useEffect, useRef } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Share, SquarePlus } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';

export function PwaPrompt() {
  const {
    promptInstall,
    dismissPrompt,
    shouldShowPrompt,
    showIOSDrawer,
    setShowIOSDrawer,
    isIOS
  } = usePwaInstall();

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
      const {
        shouldShowPrompt,
        isIOS,
        setShowIOSDrawer,
        promptInstall,
        dismissPrompt
      } = stateRef.current;

      if (shouldShowPrompt()) {
        if (isIOS) {
          setShowIOSDrawer(true);
        } else {
          // Check if toast is already active to avoid duplicates
          // (Sonner handles this by ID, but good to be explicit)
          toast.custom((t) => (
            <div className="bg-background border border-border p-4 rounded-lg shadow-lg flex flex-col gap-3 w-full max-w-sm pointer-events-auto">
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-foreground">Install Cineforum</h3>
                <p className="text-sm text-muted-foreground">
                  Install our app for the best experience.
                </p>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    dismissPrompt();
                    toast.dismiss(t);
                  }}
                >
                  Not Now
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    promptInstall();
                    toast.dismiss(t);
                  }}
                >
                  Install
                </Button>
              </div>
            </div>
          ), {
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

  return (
    <Drawer open={showIOSDrawer} onOpenChange={setShowIOSDrawer}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Install Cineforum</DrawerTitle>
            <DrawerDescription>
              Add to your Home Screen for the best experience.
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 flex flex-col gap-6">
            <div className="flex items-center gap-4">
               <div className="bg-secondary p-3 rounded-xl">
                 <Share className="w-6 h-6 text-foreground" />
               </div>
               <div className="flex-1">
                 <p className="font-medium">1. Tap the Share button</p>
                 <p className="text-sm text-muted-foreground">Usually at the bottom of the screen</p>
               </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="bg-secondary p-3 rounded-xl">
                 <SquarePlus className="w-6 h-6 text-foreground" />
               </div>
               <div className="flex-1">
                 <p className="font-medium">2. Select 'Add to Home Screen'</p>
                 <p className="text-sm text-muted-foreground">Scroll down to find it</p>
               </div>
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
