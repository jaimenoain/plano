import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
// Notification types grouped by theme
const NOTIFICATION_GROUPS = [
    {
        title: "Social & Contacts",
        types: [
            { id: "follow", label: "New followers" },
            { id: "friend_joined", label: "Friend joined Plano" },
            { id: "suggest_follow", label: "Suggested follows" },
            { id: "recommendation", label: "Building recommendations & Invites" },
        ],
    },
    {
        title: "Engagement",
        types: [
            { id: "like", label: "Likes on your reviews" },
            { id: "comment", label: "Comments on your reviews" },
        ],
    },
];
export function NotificationSettingsDialog({ open, onOpenChange }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState({});
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (open && user) {
            fetchPreferences();
        }
    }, [open, user]);
    const fetchPreferences = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("notification_preferences")
                .eq("id", user.id)
                .single();
            if (error)
                throw error;
            // Parse preferences. If a key is missing, it implies true (enabled).
            // We only store disabled preferences as false.
            const prefs = data.notification_preferences || {};
            setPreferences(prefs);
        }
        catch (_error) {
            toast({
                title: "Error",
                description: "Failed to load notification settings.",
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleToggle = (typeId, checked) => {
        setPreferences((prev) => ({
            ...prev,
            [typeId]: checked, // Store explicit true/false
        }));
    };
    const handleSave = async () => {
        try {
            setSaving(true);
            // We can store exactly what's in the state.
            // Or we can optimize to only store 'false' values if we want to save space,
            // but storing explicit 'true' is fine too.
            // The trigger logic: `(pref ->> n_type) = 'false'` checks for explicit false.
            // So if we store true, it's fine. If we remove the key, it's fine (default true).
            // Let's just store the full object for clarity.
            const { error } = await supabase
                .from("profiles")
                .update({ notification_preferences: preferences })
                .eq("id", user.id);
            if (error)
                throw error;
            toast({
                title: "Settings saved",
                description: "Your notification preferences have been updated.",
            });
            onOpenChange(false);
        }
        catch (_error) {
            toast({
                title: "Error",
                description: "Failed to save settings.",
                variant: "destructive",
            });
        }
        finally {
            setSaving(false);
        }
    };
    const isEnabled = (typeId) => {
        // If key exists, return its value. If not, default to true.
        return preferences[typeId] !== false;
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md max-h-[80vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Notification Settings" }) }), loading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-brand-primary" }) })) : (_jsxs("div", { className: "space-y-6 py-4", children: [_jsx("p", { className: "text-sm text-text-secondary", children: "Choose which notifications you want to receive. Changes will apply to future notifications." }), NOTIFICATION_GROUPS.map((group) => (_jsxs("div", { className: "space-y-3", children: [_jsx("h4", { className: "text-sm font-medium text-text-primary border-b pb-1", children: group.title }), _jsx("div", { className: "space-y-3", children: group.types.map((type) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { htmlFor: `notif-${type.id}`, className: "text-sm font-normal cursor-pointer flex-1", children: type.label }), _jsx(Switch, { id: `notif-${type.id}`, checked: isEnabled(type.id), onCheckedChange: (checked) => handleToggle(type.id, checked) })] }, type.id))) })] }, group.title)))] })), _jsxs("div", { className: "flex justify-end gap-2 pt-2 border-t mt-2", children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: saving, children: "Cancel" }), _jsxs(Button, { onClick: handleSave, disabled: saving || loading, children: [saving && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Save Changes"] })] })] }) }));
}
