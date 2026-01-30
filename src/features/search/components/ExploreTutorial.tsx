import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoveRight, MoveLeft, MoveUp, Check, X, ArrowUp } from "lucide-react";

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-sm bg-white/95 rounded-xl p-8 shadow-2xl space-y-8 text-center text-black animate-in fade-in zoom-in duration-300">
        <h2 className="text-2xl font-bold">How to Explore</h2>

        <div className="space-y-6">
          <div className="flex items-center gap-4 justify-start">
             <div className="bg-green-100 p-3 rounded-full text-green-600 shrink-0">
               <MoveRight className="w-6 h-6" />
             </div>
             <div className="text-left">
               <div className="font-semibold text-lg flex items-center gap-2">
                 Swipe Right
                 <Check className="w-4 h-4 text-green-600" />
               </div>
               <div className="text-sm text-gray-500">Save to your collection</div>
             </div>
          </div>

          <div className="flex items-center gap-4 justify-start">
             <div className="bg-red-100 p-3 rounded-full text-red-600 shrink-0">
               <MoveLeft className="w-6 h-6" />
             </div>
             <div className="text-left">
               <div className="font-semibold text-lg flex items-center gap-2">
                 Swipe Left
                 <X className="w-4 h-4 text-red-600" />
               </div>
               <div className="text-sm text-gray-500">Hide from feed</div>
             </div>
          </div>

          <div className="flex items-center gap-4 justify-start">
             <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
               <MoveUp className="w-6 h-6" />
             </div>
             <div className="text-left">
               <div className="font-semibold text-lg flex items-center gap-2">
                 Swipe Up
                 <ArrowUp className="w-4 h-4 text-blue-600" />
               </div>
               <div className="text-sm text-gray-500">Skip to next building</div>
             </div>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <Button className="w-full h-12 text-lg" size="lg" onClick={handleComplete}>
            Got it
          </Button>

          <div className="flex items-center justify-center gap-2">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label htmlFor="dont-show" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-gray-600">
              Don't show again
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
