import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-xl border-0 animate-in zoom-in-95 duration-200">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">How to Explore</CardTitle>
          <CardDescription>
            Swipe to discover amazing architecture
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6 py-6">
          <div className="flex items-center gap-4">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
               <MoveRight className="h-6 w-6" />
             </div>
             <div className="space-y-1">
               <p className="font-medium leading-none flex items-center gap-2">
                 Swipe Right
                 <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
               </p>
               <p className="text-sm text-muted-foreground">Save to your collection</p>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
               <MoveLeft className="h-6 w-6" />
             </div>
             <div className="space-y-1">
               <p className="font-medium leading-none flex items-center gap-2">
                 Swipe Left
                 <X className="h-4 w-4 text-red-600 dark:text-red-400" />
               </p>
               <p className="text-sm text-muted-foreground">Hide from feed</p>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
               <MoveUp className="h-6 w-6" />
             </div>
             <div className="space-y-1">
               <p className="font-medium leading-none flex items-center gap-2">
                 Swipe Up
                 <ArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
               </p>
               <p className="text-sm text-muted-foreground">Skip to next building</p>
             </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button className="w-full" size="lg" onClick={handleComplete}>
            Got it
          </Button>

          <div className="flex items-center justify-center gap-2">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label
              htmlFor="dont-show"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none"
            >
              Don't show again
            </label>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
