import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoveUp, Bookmark, EyeOff } from "lucide-react";

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-text-inverse">How to Explore</h2>
          <p className="text-text-inverse/70 text-lg">Swipe to discover architecture</p>
        </div>

        <div className="space-y-4">
          {/* Swipe Right */}
          <div className="flex items-center gap-5 p-4 rounded-sm bg-brand-secondary border border-border-default backdrop-blur-sm transition-colors hover:bg-brand-secondary">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-feedback-success/10 text-feedback-success">
               <Bookmark className="h-6 w-6" />
             </div>
             <div className="flex-1">
               <p className="text-lg font-medium text-text-primary flex items-center gap-2">
                 Swipe Right
               </p>
               <p className="text-sm text-text-secondary">Save to collection</p>
             </div>
          </div>

          {/* Swipe Left */}
          <div className="flex items-center gap-5 p-4 rounded-sm bg-brand-secondary border border-border-default backdrop-blur-sm transition-colors hover:bg-brand-secondary">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-feedback-destructive/10 text-feedback-destructive">
               <EyeOff className="h-6 w-6" />
             </div>
             <div className="flex-1">
               <p className="text-lg font-medium text-text-primary flex items-center gap-2">
                 Swipe Left
               </p>
               <p className="text-sm text-text-secondary">Hide from feed</p>
             </div>
          </div>

          {/* Swipe Up */}
          <div className="flex items-center gap-5 p-4 rounded-sm bg-brand-secondary border border-border-default backdrop-blur-sm transition-colors hover:bg-brand-secondary">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-text-secondary">
               <MoveUp className="h-6 w-6" />
             </div>
             <div className="flex-1">
               <p className="text-lg font-medium text-text-primary flex items-center gap-2">
                 Swipe Up
               </p>
               <p className="text-sm text-text-secondary">Next building</p>
             </div>
          </div>
        </div>

        <div className="space-y-6 pt-4">
          <Button
            className="w-full h-12 text-lg font-semibold"
            onClick={handleComplete}
          >
            Got it
          </Button>

          <div className="flex items-center justify-center gap-3">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-black h-5 w-5 rounded-md"
            />
            <label
              htmlFor="dont-show"
              className="text-sm font-medium leading-none cursor-pointer text-white/60 hover:text-white transition-colors select-none"
            >
              Don't show again
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
