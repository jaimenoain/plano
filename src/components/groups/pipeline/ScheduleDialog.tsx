import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";

interface ScheduleDialogProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any; // Backlog item
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleDialog({ item, groupId, open, onOpenChange }: ScheduleDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("new");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch upcoming sessions
  const { data: upcomingSessions, isLoading } = useQuery({
    queryKey: ["upcoming-sessions-for-scheduling", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_sessions")
        .select("id, title, session_date")
        .eq("group_id", groupId)
        .gte("session_date", new Date().toISOString())
        .order("session_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleConfirm = async () => {
    // Ensure building ID is present
    const buildingId = item.building?.id || item.building_id;

    if (!buildingId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Missing building ID for this item.",
        });
        return;
    }

    if (selectedSessionId === "new") {
      // Navigate to create session page
      navigate(
        `/groups/${groupId}/session/create?backlogId=${item.id}&buildingId=${buildingId}`
      );
      onOpenChange(false);
    } else {
      // Add to existing session
      setIsSubmitting(true);
      try {
        // 1. Add building to session
        const { error: sessionError } = await supabase
          .from("session_buildings")
          .insert({
            session_id: selectedSessionId,
            building_id: buildingId,
            is_main: false, // Default to secondary
          });

        if (sessionError) throw sessionError;

        // 2. Update backlog item status
        const { error: backlogError } = await supabase
          .from("group_backlog_items")
          .update({ status: "Scheduled" })
          .eq("id", item.id);

        if (backlogError) throw backlogError;

        toast({
          title: "Added to session",
          description: `"${item.building?.name || "Item"}" has been added to the session.`,
        });

        queryClient.invalidateQueries({ queryKey: ["group-backlog", groupId] });
        onOpenChange(false);
      } catch (error: any) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to add to session",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule "{item.building?.name || "Building"}"</DialogTitle>
          <DialogDescription>
            Choose to create a new session or add this building to an existing upcoming session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Session</label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions...
              </div>
            ) : (
              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <div className="flex items-center gap-2 font-medium">
                      <Plus className="h-4 w-4" /> Schedule New Session
                    </div>
                  </SelectItem>
                  {upcomingSessions?.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.title || "Untitled Session"} (
                      {format(new Date(session.session_date), "MMM d")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || isLoading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedSessionId === "new" ? "Continue" : "Add to Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
