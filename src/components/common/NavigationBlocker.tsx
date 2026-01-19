import { useEffect } from "react";
import { useBlocker, useBeforeUnload } from "react-router-dom";
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
  useBeforeUnload(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
  );

  // Reset blocker if form becomes clean while blocked
  useEffect(() => {
    if (blocker.state === "blocked" && !isDirty) {
        blocker.reset();
    }
  }, [blocker, isDirty]);

  return (
    <AlertDialog open={blocker.state === "blocked"}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Do you want to save or discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset()}>
            Keep Editing
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => blocker.proceed()} className="bg-destructive hover:bg-destructive/90">
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
