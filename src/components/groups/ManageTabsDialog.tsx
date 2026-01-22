import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Repeat, ListChecks, Filter, BarChart3, Tv, Calendar, Activity, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ManageTabsDialogProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALL_TABS = [
  { id: "sessions", label: "Sessions", icon: Calendar, description: "Coordinate your next meetups." },
  { id: "feed", label: "Feed", icon: Activity, description: "See member's activity" },
  { id: "members", label: "Members", icon: Users, description: "See who is in the group." },
  { id: "cycles", label: "Cycles", icon: Repeat, description: "Organize sessions into thematic cycles." },
  { id: "polls", label: "Polls", icon: ListChecks, description: "Test members, vote on decisions, gauge opinions" },
  { id: "watchlist", label: "Watchlist", icon: Tv, description: "Decide together what to watch" },
  { id: "pipeline", label: "Pipeline", icon: Filter, description: "Create a backlog of buildings to visit" },
  { id: "stats", label: "Stats", icon: BarChart3, description: "Analyze group viewing habits." },
];

export function ManageTabsDialog({ group, open, onOpenChange }: ManageTabsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTabs, setActiveTabs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Initialize active tabs from group data
  useEffect(() => {
    if (group && open) {
      // Default set if active_tabs is null
      const current = group.active_tabs || ["sessions", "feed", "members"];
      setActiveTabs(current);
    }
  }, [group, open]);

  const hasChanges = useMemo(() => {
    const initial = group?.active_tabs || ["sessions", "feed", "members"];
    if (activeTabs.length !== initial.length) return true;

    const sortedActive = [...activeTabs].sort();
    const sortedInitial = [...initial].sort();

    return sortedActive.some((tab, index) => tab !== sortedInitial[index]);
  }, [activeTabs, group]);

  const toggleTab = (tabId: string) => {
    setActiveTabs(prev => {
      if (prev.includes(tabId)) {
        if (prev.length <= 1) {
          toast({ variant: "destructive", title: "Action denied", description: "At least one tab must remain active." });
          return prev;
        }
        return prev.filter(id => id !== tabId);
      } else {
        return [...prev, tabId];
      }
    });
  };

  const sortedTabs = useMemo(() => {
    return [...ALL_TABS].sort((a, b) => {
      const aActive = activeTabs.includes(a.id);
      const bActive = activeTabs.includes(b.id);
      if (aActive === bActive) return 0;
      return aActive ? -1 : 1;
    });
  }, [activeTabs]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      setShowExitConfirmation(true);
      return;
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("groups")
        .update({ active_tabs: activeTabs })
        .eq("id", group.id);

      if (error) throw error;

      toast({ title: "Tabs updated", description: "Group navigation has been updated." });
      await queryClient.invalidateQueries({ queryKey: ["group-basic", group.slug] });
      await queryClient.invalidateQueries({ queryKey: ["group-basic", group.id] });
      onOpenChange(false);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Group Tabs</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Select which tools you want to enable for this group. At least one tab must be active.
            </p>

            <div className="grid gap-3">
              {sortedTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTabs.includes(tab.id);
                // Disable switch if this is the only active tab and it is currently active
                const isDisabled = isActive && activeTabs.length <= 1;

                return (
                  <div
                    key={tab.id}
                    className={`
                      flex items-center justify-between p-4 rounded-xl border transition-all duration-300
                      ${isActive ? "bg-muted/30 border-primary/20" : "bg-transparent border-border hover:border-border/80"}
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{tab.label}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{tab.description}</p>
                      </div>
                    </div>

                    <Switch
                      checked={isActive}
                      disabled={isDisabled}
                      onCheckedChange={() => toggleTab(tab.id)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              className="hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setShowExitConfirmation(false);
                onOpenChange(false);
              }}
            >
              Discard
            </Button>
            <Button
              onClick={() => {
                setShowExitConfirmation(false);
                handleSave();
              }}
            >
              Save
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
