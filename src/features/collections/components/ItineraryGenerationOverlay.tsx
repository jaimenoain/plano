import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

const loadingMessages = [
  "Analyzing geographical zones...",
  "Charting the perfect route...",
  "Optimizing travel times...",
];

export function ItineraryGenerationOverlay({ open }: { open: boolean }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setMessageIndex(0);
      return undefined;
    }
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogPortal>
        <DialogOverlay className="z-1200 bg-black/60 backdrop-blur-xs" />
        <DialogContent
          className="z-1200 flex items-center justify-center w-full h-full max-w-none border-none bg-transparent shadow-none sm:max-w-none"
          hideCloseButton
          // Prevent focusing trap issues if multiple dialogs are open, though Radix handles this usually.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Generating Itinerary</DialogTitle>
          <div className="bg-surface-card rounded-lg shadow-lg border border-border-default p-8 flex flex-col items-center justify-center max-w-md w-full mx-4">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <motion.svg
                viewBox="0 0 100 100"
                className="w-full h-full overflow-visible"
              >
                {/* Dots */}
                {[
                  { cx: 20, cy: 80 },
                  { cx: 40, cy: 30 },
                  { cx: 70, cy: 60 },
                  { cx: 90, cy: 20 },
                ].map((dot, i) => (
                  <motion.circle
                    key={i}
                    cx={dot.cx}
                    cy={dot.cy}
                    r="2"
                    fill="currentColor"
                    className="text-brand-primary"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.3, duration: 0.5 }}
                  />
                ))}

                {/* Path */}
                <motion.path
                  d="M 20 80 L 40 30 L 70 60 L 90 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-brand-primary"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: 2.5,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "loop",
                    repeatDelay: 0.5
                  }}
                />
              </motion.svg>
            </div>

            <div className="h-8 mt-6 flex items-center justify-center w-full max-w-md px-2">
              <AnimatePresence mode="wait">
                <motion.p
                  key={messageIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-lg font-semibold text-center text-text-primary"
                >
                  {loadingMessages[messageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
