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

interface ExploreTutorialProps {
  onComplete: () => void;
}

export function ExploreTutorial({ onComplete }: ExploreTutorialProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem("explore-tutorial-seen", "true");
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm animate-in fade-in duration-500">
      {/* Full-height layout: title top, gestures middle, CTA bottom */}
      <div className="h-full flex flex-col justify-between px-8 sm:px-12 py-12 sm:py-16 max-w-md">

        {/* ── TOP: Film-title heading ── */}
        <div>
          <p className="text-2xs font-medium tracking-[0.25em] uppercase text-white/30 mb-4">
            Plano · Explore
          </p>
          <h2 className="text-6xl sm:text-7xl font-bold tracking-tight text-white leading-none">
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
          <button
            onClick={handleComplete}
            className="text-sm font-medium uppercase tracking-[0.15em] text-white hover:opacity-60 transition-opacity"
          >
            Begin exploring →
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