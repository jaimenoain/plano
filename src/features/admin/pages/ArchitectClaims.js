import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/features/auth/hooks/useAuth";
export default function ArchitectClaims() {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();
    const [processingId, setProcessingId] = useState(null);
    useEffect(() => {
        fetchClaims();
    }, []);
    const fetchClaims = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("architect_claims")
                .select(`
          *,
          user:user_id(username, avatar_url),
          architect:architect_id(name, type)
        `)
                .eq("status", "pending")
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            // Transform data to match interface if needed (Supabase types might be loose)
            // The join syntax user:user_id(...) returns an object or array depending on relation.
            // Since it's Many-to-One (claim -> user), it should be an object.
            setClaims(data ?? []);
        }
        catch (_error) {
            toast.error("Failed to load claims");
        }
        finally {
            setLoading(false);
        }
    };
    const handleApprove = async (claim) => {
        if (!currentUser)
            return;
        setProcessingId(claim.id);
        try {
            // 1. Update claim status
            const { error: updateError } = await supabase
                .from("architect_claims")
                .update({ status: "verified", resolved_at: new Date().toISOString() })
                .eq("id", claim.id);
            if (updateError)
                throw updateError;
            // 2. Send notification
            const { error: notifError } = await supabase
                .from("notifications")
                .insert({
                user_id: claim.user_id,
                actor_id: currentUser.id,
                type: "architect_verification",
                architect_id: claim.architect_id,
                metadata: { status: 'approved' }
            });
            if (notifError)
                throw notifError;
        }
        catch (_error) {
            toast.error("Failed to approve claim");
            return;
        }
        // Optimistic update
        setClaims(prev => prev.filter(c => c.id !== claim.id));
        toast.success("Claim approved");
        setProcessingId(null);
    };
    const handleDeny = async (claim) => {
        if (!currentUser)
            return;
        setProcessingId(claim.id);
        try {
            const { error: updateError } = await supabase
                .from("architect_claims")
                .update({ status: "rejected", resolved_at: new Date().toISOString() })
                .eq("id", claim.id);
            if (updateError)
                throw updateError;
            const { error: rejectNotifError } = await supabase
                .from("notifications")
                .insert({
                user_id: claim.user_id,
                actor_id: currentUser.id,
                type: "architect_verification",
                architect_id: claim.architect_id,
                metadata: { status: 'rejected' }
            });
            if (rejectNotifError)
                throw rejectNotifError;
        }
        catch (_error) {
            toast.error("Failed to deny claim");
            return;
        }
        setClaims(prev => prev.filter(c => c.id !== claim.id));
        toast.success("Claim denied");
        setProcessingId(null);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Pending Claims" }), _jsxs(Badge, { variant: "outline", className: "px-3 py-1", children: [claims.length, " Pending"] })] }), _jsx("div", { className: "rounded-md border bg-surface-card", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "User" }), _jsx(TableHead, { children: "Target Architect" }), _jsx(TableHead, { children: "Proof of Affiliation" }), _jsx(TableHead, { children: "Submitted" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: loading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "h-24 text-center", children: _jsxs("div", { className: "flex justify-center items-center", children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin mr-2" }), "Loading..."] }) }) })) : claims.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "h-24 text-center text-text-secondary", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx(ShieldCheck, { className: "h-8 w-8 opacity-20" }), _jsx("p", { children: "No pending verification claims." })] }) }) })) : (claims.map((claim) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs(Avatar, { className: "h-9 w-9", children: [_jsx(AvatarImage, { src: claim.user.avatar_url || undefined }), _jsx(AvatarFallback, { children: claim.user.username?.charAt(0).toUpperCase() || "?" })] }), _jsx("div", { className: "flex flex-col", children: _jsx("span", { className: "font-medium text-sm", children: claim.user.username || "Unknown" }) })] }) }), _jsx(TableCell, { children: _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "font-medium", children: claim.architect.name }), _jsx("span", { className: "text-xs text-text-secondary capitalize", children: claim.architect.type })] }) }), _jsx(TableCell, { children: _jsx("code", { className: "relative rounded bg-surface-muted px-[0.3rem] py-[0.2rem] font-mono text-sm", children: claim.proof_email }) }), _jsx(TableCell, { className: "text-text-secondary text-sm", children: formatDistanceToNow(new Date(claim.created_at), { addSuffix: true }) }), _jsx(TableCell, { className: "text-right", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsxs(Button, { size: "sm", variant: "ghost", className: "text-feedback-destructive hover:text-feedback-destructive hover:bg-feedback-destructive/10", onClick: () => handleDeny(claim), disabled: processingId === claim.id, children: [processingId === claim.id ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(X, { className: "h-4 w-4 mr-1" }), "Deny"] }), _jsxs(Button, { size: "sm", variant: "default", className: "bg-green-600 hover:bg-green-700", onClick: () => handleApprove(claim), disabled: processingId === claim.id, children: [processingId === claim.id ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Check, { className: "h-4 w-4 mr-1" }), "Approve"] })] }) })] }, claim.id)))) })] }) })] }));
}
