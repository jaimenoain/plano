
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
    title: "Groups & Field Trips",
    types: [
      { id: "new_session", label: "New field trip scheduled" },
      { id: "session_reminder", label: "Field trip reminders" },
      { id: "group_invitation", label: "Group invitations" },
      { id: "join_request", label: "Group join requests" },
      { id: "group_activity", label: "Group activity (member left)" },
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

export function NotificationSettingsDialog({ open, onOpenChange }: NotificationSettingsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
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
        .eq("id", user!.id)
        .single();

      if (error) throw error;

      // Parse preferences. If a key is missing, it implies true (enabled).
      // We only store disabled preferences as false.
      const prefs = (data.notification_preferences as Record<string, boolean>) || {};
      setPreferences(prefs);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      toast({
        title: "Error",
        description: "Failed to load notification settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (typeId: string, checked: boolean) => {
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
        .eq("id", user!.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isEnabled = (typeId: string) => {
    // If key exists, return its value. If not, default to true.
    return preferences[typeId] !== false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground">
              Choose which notifications you want to receive. Changes will apply to future notifications.
            </p>

            {NOTIFICATION_GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <h4 className="text-sm font-medium text-foreground border-b pb-1">
                  {group.title}
                </h4>
                <div className="space-y-3">
                  {group.types.map((type) => (
                    <div key={type.id} className="flex items-center justify-between">
                      <Label htmlFor={`notif-${type.id}`} className="text-sm font-normal cursor-pointer flex-1">
                        {type.label}
                      </Label>
                      <Switch
                        id={`notif-${type.id}`}
                        checked={isEnabled(type.id)}
                        onCheckedChange={(checked) => handleToggle(type.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
