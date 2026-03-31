import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useBlocker, useBeforeUnload } from "react-router";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
export function NavigationBlocker({ isDirty }) {
    const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname);
    // Handle browser refresh/close
    useBeforeUnload((e) => {
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
    return (_jsx(AlertDialog, { open: blocker.state === "blocked", children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Unsaved Changes" }), _jsx(AlertDialogDescription, { children: "You have unsaved changes. Do you want to save or discard them?" })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { onClick: () => blocker.reset?.(), children: "Keep Editing" }), _jsx(AlertDialogAction, { onClick: () => blocker.proceed?.(), className: "bg-feedback-destructive hover:bg-feedback-destructive/90", children: "Discard Changes" })] })] }) }));
}
