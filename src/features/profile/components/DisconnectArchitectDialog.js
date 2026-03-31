import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
export function DisconnectArchitectDialog({ open, onOpenChange, onSuccess, architectId, }) {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleDisconnect = async () => {
        if (!user)
            return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from("architect_claims")
                .delete()
                .eq("user_id", user.id)
                .eq("architect_id", architectId);
            if (error)
                throw error;
            toast.success("Successfully disconnected from architect profile.");
            onSuccess();
            onOpenChange(false);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to disconnect profile. Please try again.");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2 text-feedback-destructive", children: [_jsx(AlertTriangle, { className: "h-5 w-5" }), "Disconnect Architect Profile"] }), _jsx(DialogDescription, { className: "pt-2 text-base", children: "Are you sure you want to disconnect your profile from this architect or architecture studio?" })] }), _jsxs("div", { className: "py-4 space-y-4 text-sm text-text-secondary", children: [_jsx("p", { children: "You will lose access to the architect dashboard and will no longer be able to manage official building data." }), _jsx("p", { className: "font-medium text-text-primary", children: "Note: All studio and building data you introduced will remain in the system." })] }), _jsxs(DialogFooter, { className: "gap-2 sm:gap-0", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), disabled: isSubmitting, children: "Cancel" }), _jsxs(Button, { type: "button", variant: "destructive", onClick: handleDisconnect, disabled: isSubmitting, children: [isSubmitting && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Confirm Disconnect"] })] })] }) }));
}
