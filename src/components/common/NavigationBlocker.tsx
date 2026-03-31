import { useEffect } from "react";
import { useBlocker, useBeforeUnload } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavigationBlockerProps {
  isDirty: boolean;
}

export function NavigationBlocker({ isDirty }: NavigationBlockerProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle browser refresh/close
  useBeforeUnload((e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // Reset blocker if form becomes clean while blocked
  useEffect(() => {
    if (blocker.state === "blocked" && !isDirty) {
        blocker.reset();
    }
  }, [blocker, isDirty]);

  return (
    <AlertDialog open={blocker.state === "blocked"}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Do you want to save or discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset?.()}>
            Keep Editing
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => blocker.proceed?.()} className="bg-feedback-destructive hover:bg-feedback-destructive/90">
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
