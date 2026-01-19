import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateCycleDialogProps {
  groupId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  cycleToEdit?: { id: string, title: string, description: string, status?: string, host_notes?: string } | null;
}

export function CreateCycleDialog({ groupId, trigger, open, onOpenChange, onSuccess, cycleToEdit }: CreateCycleDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hostNotes, setHostNotes] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Reset or populate form when opening/changing edit mode
  useEffect(() => {
    if (cycleToEdit) {
      setTitle(cycleToEdit.title);
      setDescription(cycleToEdit.description || "");
      setHostNotes(cycleToEdit.host_notes || "");
      setIsDraft(cycleToEdit.status === 'draft');
    } else {
      setTitle("");
      setDescription("");
      setHostNotes("");
      setIsDraft(false);
    }
  }, [cycleToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // If saving as draft, status is 'draft'.
      // If NOT draft, we default to 'active' UNLESS we are editing an 'archived' cycle,
      // in which case we preserve the 'archived' status to prevent accidental re-activation.
      const resolvedStatus = isDraft
        ? 'draft'
        : (cycleToEdit?.status === 'archived' ? 'archived' : 'active');

      const isActive = resolvedStatus === 'active';

      if (cycleToEdit) {
        const { error } = await supabase
          .from("group_cycles")
          .update({
            title,
            description,
            host_notes: hostNotes,
            status: resolvedStatus,
            is_active: isActive
          })
          .eq("id", cycleToEdit.id);
        if (error) throw error;
        toast({ title: "Cycle updated" });
      } else {
        const { error } = await supabase
          .from("group_cycles")
          .insert({
            group_id: groupId,
            title,
            description,
            host_notes: hostNotes,
            is_active: isActive,
            status: resolvedStatus
          });
        if (error) throw error;
        toast({ title: "Cycle created" });
      }

      onSuccess?.();
      onOpenChange?.(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cycleToEdit ? "Edit Cycle" : "Create New Cycle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Horror Month"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What is this cycle about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hostNotes">Host Notes (Admin Only)</Label>
            <Textarea
              id="hostNotes"
              placeholder="Private notes for admins..."
              value={hostNotes}
              onChange={(e) => setHostNotes(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="cycle-draft" checked={isDraft} onCheckedChange={setIsDraft} />
            <Label htmlFor="cycle-draft">Save as Draft</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (cycleToEdit ? "Save Changes" : "Create Cycle")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
