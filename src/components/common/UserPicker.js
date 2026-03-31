import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
export function UserPicker({ selectedIds, onSelect, onRemove, className, modal }) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState("");
    useEffect(() => {
        async function fetchFollowing() {
            if (!user)
                return;
            setLoading(true);
            try {
                // Fetch users I follow
                const { data: follows } = await supabase
                    .from("follows")
                    .select("following_id")
                    .eq("follower_id", user.id);
                const ids = follows?.map(f => f.following_id) || [];
                if (ids.length > 0) {
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("id, username, avatar_url")
                        .in("id", ids);
                    setUsers(profiles || []);
                }
            }
            catch (_error) {
            }
            finally {
                setLoading(false);
            }
        }
        fetchFollowing();
    }, [user]);
    // Filter users based on query
    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(query.toLowerCase()));
    const selectedUsers = users.filter(u => selectedIds.includes(u.id));
    return (_jsxs("div", { className: cn("space-y-3", className), children: [selectedUsers.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2", children: selectedUsers.map(u => (_jsxs(Badge, { variant: "secondary", className: "pl-1 pr-3 py-1.5 gap-2 rounded-full text-sm", children: [_jsxs(Avatar, { className: "h-7 w-7", children: [_jsx(AvatarImage, { src: u.avatar_url || undefined }), _jsx(AvatarFallback, { className: "text-xs", children: u.username.charAt(0).toUpperCase() })] }), _jsx("span", { children: u.username }), _jsx(X, { className: "h-4 w-4 cursor-pointer hover:text-feedback-destructive transition-colors", onClick: () => onRemove(u.id) })] }, u.id))) })), _jsxs(Popover, { open: open, onOpenChange: setOpen, modal: modal, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", role: "combobox", "aria-expanded": open, className: "w-full justify-between bg-surface-muted/20 border-border-default text-text-secondary hover:text-text-primary", children: [selectedIds.length > 0 ? "Add more people..." : "Select friends...", _jsx(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })] }) }), _jsx(PopoverContent, { className: "w-[300px] p-0", align: "start", children: _jsxs(Command, { shouldFilter: false, children: [_jsx(CommandInput, { placeholder: "Search friends...", value: query, onValueChange: setQuery, autoFocus: false }), _jsx(CommandList, { children: loading ? (_jsx("div", { className: "py-6 text-center text-sm text-text-secondary", children: "Loading..." })) : filteredUsers.length === 0 ? (_jsx(CommandEmpty, { children: "No friends found." })) : (_jsx(CommandGroup, { children: filteredUsers.map((u) => (_jsxs(CommandItem, { value: u.username, onSelect: () => {
                                                if (selectedIds.includes(u.id)) {
                                                    onRemove(u.id);
                                                }
                                                else {
                                                    onSelect(u.id);
                                                }
                                                setOpen(false);
                                            }, children: [_jsx(Check, { className: cn("mr-2 h-4 w-4", selectedIds.includes(u.id) ? "opacity-100" : "opacity-0") }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Avatar, { className: "h-6 w-6", children: [_jsx(AvatarImage, { src: u.avatar_url || undefined }), _jsx(AvatarFallback, { className: "text-[10px]", children: u.username.charAt(0) })] }), _jsx("span", { children: u.username })] })] }, u.id))) })) })] }) })] })] }));
}
