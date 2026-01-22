import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { format } from "date-fns";

interface AddSessionToCycleDialogProps {
  groupId: string;
  cycleId: string;
  onSuccess?: () => void;
}

export function AddSessionToCycleDialog({ groupId, cycleId, onSuccess }: AddSessionToCycleDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: availableSessions, isLoading } = useQuery({
    queryKey: ["available-sessions-for-cycle", groupId],
    queryFn: async () => {
      // Fetch sessions that are NOT already in a cycle (or maybe just not in THIS cycle?)
      // User request: "especially when there are no sessions linked yet" implies linking existing sessions.
      // Usually a session belongs to one cycle. So we look for sessions with cycle_id IS NULL.
      const { data, error } = await supabase
        .from("group_sessions")
        .select("id, title, session_date")
        .eq("group_id", groupId)
        .is("cycle_id", null)
        .order("session_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open, // Only fetch when dialog opens
  });

  const addSessionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSessionId) return;
      const { error } = await supabase
        .from("group_sessions")
        .update({ cycle_id: cycleId })
        .eq("id", selectedSessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Field trip added to cycle" });
      setOpen(false);
      setSelectedSessionId(null);

      // Invalidate queries to refresh the cycle view AND the cycle list count
      queryClient.invalidateQueries({ queryKey: ["cycle-sessions", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["group-cycles", groupId] });
      queryClient.invalidateQueries({ queryKey: ["available-sessions-for-cycle", groupId] });

      onSuccess?.();
    },
    onError: (error) => {
        toast({ title: "Error adding field trip", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Field Trip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Field Trip to Cycle</DialogTitle>
          <DialogDescription>
            Select an existing field trip to add to this cycle. Only field trips not currently assigned to a cycle are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            {isLoading ? (
                <div className="text-center text-sm text-muted-foreground">Loading field trips...</div>
            ) : availableSessions && availableSessions.length > 0 ? (
                <div className="space-y-2">
                    <Select value={selectedSessionId || ""} onValueChange={setSelectedSessionId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a field trip..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSessions.map((session) => (
                                <SelectItem key={session.id} value={session.id}>
                                    {session.title || "Untitled Field Trip"} - {format(new Date(session.session_date), "MMM d, yyyy")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <div className="text-center text-sm text-muted-foreground border border-dashed p-4 rounded-md">
                    No unassigned field trips found.
                    <br />
                    <Button variant="link" className="h-auto p-0" onClick={() => setOpen(false)}>Plan a new field trip</Button> instead?
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                    onClick={() => addSessionMutation.mutate()}
                    disabled={!selectedSessionId || addSessionMutation.isPending}
                >
                    {addSessionMutation.isPending ? "Adding..." : "Add Field Trip"}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
