import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface JoinGroupDialogProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group: any;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function JoinGroupDialog({ group, trigger, open, onOpenChange }: JoinGroupDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [requestNote, setRequestNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const show = isControlled ? open : internalOpen;
  const setShow = isControlled ? onOpenChange : setInternalOpen;

  const handleRequestJoin = async () => {
    if (!group || !user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
        status: 'pending',
        note: requestNote
      });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admins = group.members?.filter((m: any) => m.role === 'admin') || [];
      if (admins.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const notifications = admins.map((admin: any) => ({
          user_id: admin.user.id,
          actor_id: user.id,
          type: 'join_request',
          is_read: false,
          group_id: group.id,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      toast({ title: "Request sent", description: "The admins will review your request." });
      setShow?.(false);
      await queryClient.invalidateQueries({ queryKey: ["group-basic"] });
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request to Join {group.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Note to Admins (Optional)</label>
            <Textarea
              placeholder="Hi! I'd love to join because..."
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleRequestJoin} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
