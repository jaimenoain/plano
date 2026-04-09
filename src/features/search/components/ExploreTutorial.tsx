/**
 * ExploreTutorial.tsx — Redesigned with A24 cinematic aesthetic
 *
 * Old: Card containers with colored icon boxes + centered layout
 * New: Full-height typographic layout — giant heading, minimal gesture list,
 *      inverted full-width CTA. Like the title sequence of a documentary.
 *      No card chrome. No colored boxes. Content on darkness.
 *
 * Mobile-first: all spacing tuned to fit within a phone viewport without scroll.
 */
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Bookmark, EyeOff, MoveUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExploreTutorialProps {
  onComplete: () => void;
  isSidebarOpen?: boolean;
}

export function ExploreTutorial({ onComplete, isSidebarOpen }: ExploreTutorialProps) {
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
        "fixed inset-y-0 right-0 z-[60] bg-black/95 backdrop-blur-sm animate-in fade-in duration-500 [transition:left_200ms_linear]",
        !isSidebarOpen && "left-0"
      )}
      style={isSidebarOpen ? { left: "var(--sidebar-width)" } : undefined}
    >
      {/* Full-height layout: title top, gestures middle, CTA bottom */}
      {/* py reduced from py-12/py-16 → py-8/py-12 to fit mobile without scroll */}
      <div className="h-full flex flex-col justify-between px-8 sm:px-12 py-8 sm:py-12 max-w-md">

        {/* ── TOP: Film-title heading ── */}
        <div>
          <p className="text-2xs font-medium tracking-[0.25em] uppercase text-white/30 mb-3">
            Plano · Explore
          </p>
          {/* text-5xl on mobile (was 6xl) — still dominates, gains back ~1 line of height */}
          <h2 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-none">
            Discover<br />Architecture
          </h2>
        </div>

        {/* ── MIDDLE: Gesture list — no cards, pure text ── */}
        {/* space-y reduced from 8 → 5, pt reduced from 10 → 7 to reclaim vertical space */}
        <div className="space-y-5 border-t border-white/10 pt-7">
          <div className="flex items-start gap-5">
            <Bookmark
              className="w-4 h-4 text-white/30 shrink-0 mt-0.5"
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
              className="w-4 h-4 text-white/30 shrink-0 mt-0.5"
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
              className="w-4 h-4 text-white/30 shrink-0 mt-0.5"
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
        {/* space-y reduced from 6 → 4 */}
        <div className="space-y-4">

          {/*
            CTA: full-width inverted button (white bg, black text).
            Contrast against the black page makes this unmissable.
            Arrow uses a hairline rule + chevron to signal "proceed", not just "press".
          */}
          <button
            onClick={handleComplete}
            className="
              w-full flex items-center justify-between
              bg-white text-black
              px-6 py-4
              text-xs font-bold uppercase tracking-[0.15em]
              hover:bg-white/90 active:bg-white/80
              transition-colors duration-150
            "
          >
            <span>Begin exploring</span>

            {/* Long arrow: hairline rule + arrowhead */}
            <span className="flex items-center gap-0" aria-hidden>
              <span className="block w-12 h-px bg-black" />
              <span className="block w-8 h-px bg-black" />   {/* two segments = visual length */}
              <svg
                width="10" height="10" viewBox="0 0 10 10"
                fill="none" className="ml-0.5 shrink-0"
              >
                <path d="M1 5h8M5 1l4 4-4 4" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          {/* Don't show again — secondary, sits quietly below the primary action */}
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