/**
 * ExploreTutorial.tsx — Redesigned with A24 cinematic aesthetic
 *
 * Old: Card containers with colored icon boxes + centered layout
 * New: Full-height typographic layout — giant heading, minimal gesture list,
 *      text CTA. Like the title sequence of a documentary.
 *      No card chrome. No colored boxes. Content on darkness.
 */
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Bookmark, EyeOff, MoveUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExploreTutorialProps {
  onComplete: () => void;
  /**
   * When true (default), the overlay sits below MobileTopBar + AppTopNav and above BottomNav
   * so the shell header stays visible and interactive.
   */
  belowAppTopChrome?: boolean;
}

export function ExploreTutorial({
  onComplete,
  belowAppTopChrome = true,
}: ExploreTutorialProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem("explore-tutorial-seen", "true");
    }
    onComplete();
  };

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[55] bg-black/95 backdrop-blur-sm animate-in fade-in duration-500",
        belowAppTopChrome
          ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] md:top-16"
          : "inset-0"
      )}
    >
      {/* Full-height layout: title top, gestures middle, CTA bottom */}
      <div className="h-full flex flex-col justify-between px-8 sm:px-12 py-12 sm:py-16 max-w-md">

        {/* ── TOP: Film-title heading ── */}
        <div>
          <p className="text-2xs font-medium tracking-[0.25em] uppercase text-white/30 mb-4">
            Plano · Explore
          </p>
          <h2 className="text-3xl sm:text-7xl font-bold tracking-tight text-white leading-none">
            Discover<br />Architecture
          </h2>
        </div>

        {/* ── MIDDLE: Gesture list — no cards, pure text ── */}
        <div className="space-y-8 border-t border-white/10 pt-10">
          <div className="flex items-start gap-5">
            <Bookmark
              className="w-4 h-4 text-white/30 shrink-0 mt-1"
              strokeWidth={1.5}
            />
            <div>
              <p className="text-base font-semibold text-white leading-tight mb-0.5">
                Swipe right
              </p>
              <p className="text-sm text-white/40">Save to your list</p>
            </div>
          </div>

          <div className="flex items-start gap-5">
            <EyeOff
              className="w-4 h-4 text-white/30 shrink-0 mt-1"
              strokeWidth={1.5}
            />
            <div>
              <p className="text-base font-semibold text-white leading-tight mb-0.5">
                Swipe left
              </p>
              <p className="text-sm text-white/40">Hide from feed</p>
            </div>
          </div>

          <div className="flex items-start gap-5">
            <MoveUp
              className="w-4 h-4 text-white/30 shrink-0 mt-1"
              strokeWidth={1.5}
            />
            <div>
              <p className="text-base font-semibold text-white leading-tight mb-0.5">
                Scroll up
              </p>
              <p className="text-sm text-white/40">Next building</p>
            </div>
          </div>
        </div>

        {/* ── BOTTOM: CTA + don't show again ── */}
        <div className="space-y-6">
          <style>{`
            @keyframes arrowGrow {
              from { transform: scaleX(0.08); opacity: 0; }
              to   { transform: scaleX(1);    opacity: 1; }
            }
          `}</style>
          <button
            onClick={handleComplete}
            className="group flex items-center gap-5 hover:opacity-60 transition-opacity"
          >
            <span className="text-2xl font-bold uppercase tracking-[0.12em] text-white leading-none whitespace-nowrap">
              Begin exploring
            </span>
            <span
              className="inline-flex items-center origin-left"
              style={{ animation: "arrowGrow 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both" }}
            >
              <svg
                viewBox="0 0 96 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 h-3.5 text-white"
              >
                <line x1="0" y1="7" x2="82" y2="7" stroke="currentColor" strokeWidth="1.5" />
                <polyline points="75,1 82,7 75,13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black h-4 w-4 rounded-none"
            />
            <label
              htmlFor="dont-show"
              className="text-xs font-medium uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors cursor-pointer select-none"
            >
              Don&apos;t show again
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}