import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router";
export function BlockUserDialog({ open, onOpenChange, userId, username }) {
    const [reason, setReason] = useState("");
    const [reportAbuse, setReportAbuse] = useState(false);
    const [details, setDetails] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();
    const handleBlock = async () => {
        if (!reason) {
            toast({ variant: "destructive", description: "Please select a reason for blocking." });
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.rpc("block_user", {
                p_target_id: userId,
                p_reason: reason,
                p_report_abuse: reportAbuse,
                p_report_details: details || null
            });
            if (error)
                throw error;
            toast({ description: `Blocked ${username}.` });
            onOpenChange(false);
            // Navigate away to feed or home, as profile is now inaccessible
            navigate("/");
        }
        catch (error) {
            toast({ variant: "destructive", description: error instanceof Error ? error.message : "Failed to block user." });
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2 text-feedback-destructive", children: [_jsx(AlertTriangle, { className: "h-5 w-5" }), "Block ", username, "?"] }), _jsx(DialogDescription, { children: "They won't be able to find your profile, posts, or story on PLANO. They won't be notified that you blocked them." })] }), _jsxs("div", { className: "grid gap-4 py-4", children: [_jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "reason", children: "Reason for blocking" }), _jsxs(Select, { value: reason, onValueChange: setReason, children: [_jsx(SelectTrigger, { id: "reason", children: _jsx(SelectValue, { placeholder: "Select a reason" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "harassment", children: "Harassment or bullying" }), _jsx(SelectItem, { value: "spam", children: "Spam" }), _jsx(SelectItem, { value: "inappropriate", children: "Inappropriate content" }), _jsx(SelectItem, { value: "impersonation", children: "Impersonation" }), _jsx(SelectItem, { value: "other", children: "Other" })] })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: "report", checked: reportAbuse, onCheckedChange: (c) => setReportAbuse(!!c) }), _jsx(Label, { htmlFor: "report", className: "font-normal cursor-pointer", children: "Report abuse" })] }), reportAbuse && (_jsxs("div", { className: "grid gap-2 animate-in fade-in zoom-in-95 duration-200", children: [_jsx(Label, { htmlFor: "details", children: "Details (optional)" }), _jsx(Textarea, { id: "details", placeholder: "Please provide more details...", value: details, onChange: (e) => setDetails(e.target.value), className: "resize-none" })] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: loading, children: "Cancel" }), _jsxs(Button, { variant: "destructive", onClick: handleBlock, disabled: loading, children: [loading && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Block"] })] })] }) }));
}
