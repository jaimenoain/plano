import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoveRight, MoveLeft, MoveUp } from "lucide-react";

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
          <h2 className="text-3xl font-bold tracking-tight text-white">How to Explore</h2>
          <p className="text-white/60 text-lg">Swipe to discover architecture</p>
        </div>

        <div className="space-y-4">
          {/* Swipe Right */}
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400">
               <MoveRight className="h-6 w-6" />
             </div>
             <div className="flex-1">
               <p className="text-lg font-medium text-white flex items-center gap-2">
                 Swipe Right
               </p>
               <p className="text-sm text-white/50">Save to collection</p>
             </div>
          </div>

          {/* Swipe Left */}
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
               <MoveLeft className="h-6 w-6" />
             </div>
             <div className="flex-1">
               <p className="text-lg font-medium text-white flex items-center gap-2">
                 Swipe Left
               </p>
               <p className="text-sm text-white/50">Hide from feed</p>
             </div>
          </div>

          {/* Swipe Up */}
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-500/20 text-gray-400">
               <MoveUp className="h-6 w-6" />
             </div>
             <div className="flex-1">
               <p className="text-lg font-medium text-white flex items-center gap-2">
                 Swipe Up
               </p>
               <p className="text-sm text-white/50">Next building</p>
             </div>
          </div>
        </div>

        <div className="space-y-6 pt-4">
          <Button
            className="w-full h-14 rounded-full text-lg font-semibold bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform active:scale-95"
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
