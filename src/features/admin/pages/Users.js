import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Ban, RefreshCw, UserX } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentAdminId, setCurrentAdminId] = useState(null);
    const [actionUser, setActionUser] = useState(null);
    const ITEMS_PER_PAGE = 20;
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentAdminId(data.user?.id || null);
        });
        fetchUsers();
    }, [page, searchQuery]);
    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("profiles")
                .select("*", { count: "exact" })
                .order("created_at", { ascending: false });
            if (searchQuery) {
                query = query.ilike("username", `%${searchQuery}%`);
            }
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            const { data, count, error } = await query.range(from, to);
            if (error)
                throw error;
            setUsers(data || []);
            if (count) {
                setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
            }
        }
        catch (_error) {
            toast.error("Failed to load users");
        }
        finally {
            setLoading(false);
        }
    };
    const handleAction = async () => {
        if (!actionUser || !currentAdminId)
            return;
        try {
            if (actionUser.type === 'reset') {
                const genericUsername = `User${actionUser.user.id.substring(0, 8)}`;
                const { error } = await supabase
                    .from('profiles')
                    .update({ username: genericUsername, avatar_url: null })
                    .eq('id', actionUser.user.id);
                if (error)
                    throw error;
                // Log audit
                await supabase.from('admin_audit_logs').insert({
                    admin_id: currentAdminId,
                    action_type: 'reset_profile',
                    target_type: 'user',
                    target_id: actionUser.user.id,
                    details: { username: actionUser.user.username }
                });
                toast.success("Profile reset successfully");
                setUsers(prev => prev.map(u => u.id === actionUser.user.id ? { ...u, username: genericUsername, avatar_url: null } : u));
            }
            else if (actionUser.type === 'suspend') {
                const newRole = actionUser.user.role === 'suspended' ? 'user' : 'suspended';
                const { error } = await supabase
                    .from('profiles')
                    .update({ role: newRole })
                    .eq('id', actionUser.user.id);
                if (error)
                    throw error;
                // Log audit
                await supabase.from('admin_audit_logs').insert({
                    admin_id: currentAdminId,
                    action_type: newRole === 'suspended' ? 'suspend_user' : 'restore_user',
                    target_type: 'user',
                    target_id: actionUser.user.id,
                    details: { username: actionUser.user.username, previous_role: actionUser.user.role }
                });
                toast.success(newRole === 'suspended' ? "User suspended" : "User restored");
                setUsers(prev => prev.map(u => u.id === actionUser.user.id ? { ...u, role: newRole } : u));
            }
        }
        catch (_error) {
            toast.error("Action failed");
        }
        finally {
            setActionUser(null);
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "User Roster" }), _jsx(Input, { placeholder: "Search users...", className: "max-w-xs", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) })] }), _jsx("div", { className: "rounded-md border bg-surface-card", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "User" }), _jsx(TableHead, { children: "Role" }), _jsx(TableHead, { children: "Joined" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: loading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, className: "h-24 text-center", children: _jsxs("div", { className: "flex justify-center items-center", children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin mr-2" }), "Loading..."] }) }) })) : users.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, className: "h-24 text-center text-text-secondary", children: "No users found." }) })) : (users.map((user) => (_jsxs(TableRow, { className: user.role === 'suspended' ? "opacity-60 bg-red-500/5" : "", children: [_jsx(TableCell, { children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs(Avatar, { children: [_jsx(AvatarImage, { src: user.avatar_url || undefined }), _jsx(AvatarFallback, { children: user.username?.charAt(0).toUpperCase() || "?" })] }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "font-medium", children: user.username || "Unknown" }), _jsx("span", { className: "text-xs text-text-secondary", children: user.id })] })] }) }), _jsx(TableCell, { children: _jsx(Badge, { variant: user.role === 'admin' || user.role === 'app_admin' ? "default" : user.role === 'suspended' ? "destructive" : "secondary", children: user.role || "User" }) }), _jsx(TableCell, { children: user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "-" }), _jsx(TableCell, { className: "text-right", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { size: "icon", variant: "ghost", title: "Reset Profile", onClick: () => setActionUser({ type: 'reset', user }), children: _jsx(RefreshCw, { className: "h-4 w-4" }) }), _jsx(Button, { size: "icon", variant: "ghost", className: user.role === 'suspended' ? "text-green-600" : "text-feedback-destructive", title: user.role === 'suspended' ? "Restore Access" : "Suspend User", onClick: () => setActionUser({ type: 'suspend', user }), children: user.role === 'suspended' ? _jsx(UserX, { className: "h-4 w-4" }) : _jsx(Ban, { className: "h-4 w-4" }) })] }) })] }, user.id)))) })] }) }), _jsxs("div", { className: "flex justify-center gap-2", children: [_jsx(Button, { variant: "outline", disabled: page === 1, onClick: () => setPage(p => p - 1), children: "Previous" }), _jsx(Button, { variant: "outline", disabled: page >= totalPages, onClick: () => setPage(p => p + 1), children: "Next" })] }), _jsx(AlertDialog, { open: !!actionUser, onOpenChange: (open) => !open && setActionUser(null), children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Are you sure?" }), _jsx(AlertDialogDescription, { children: actionUser?.type === 'reset'
                                        ? `This will reset the username and avatar for ${actionUser.user.username}.`
                                        : actionUser?.user.role === 'suspended'
                                            ? `This will restore access for ${actionUser.user.username}.`
                                            : `This will suspend ${actionUser?.user.username} and revoke their access.` })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: handleAction, className: actionUser?.type === 'reset' ? "" : "bg-feedback-destructive hover:bg-feedback-destructive/90", children: "Confirm" })] })] }) })] }));
}
