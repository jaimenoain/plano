import React, { useState, useEffect } from "react";
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
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogPortal>
        <DialogOverlay className="z-[1200] bg-background/95 backdrop-blur-md" />
        <DialogContent
          className="z-[1200] flex flex-col items-center justify-center w-full h-full max-w-none border-none bg-transparent shadow-none sm:max-w-none"
          hideCloseButton
          // Prevent focusing trap issues if multiple dialogs are open, though Radix handles this usually.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Generating Itinerary</DialogTitle>
          <div className="relative w-64 h-64 flex items-center justify-center">
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
                  className="text-primary"
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
                className="text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" // Attempt to use CSS variable if available, otherwise fallback is managed by browser or ignored
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

          <div className="h-8 mt-8 flex items-center justify-center w-full max-w-md px-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-lg font-medium text-center text-foreground"
              >
                {loadingMessages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
