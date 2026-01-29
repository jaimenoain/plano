import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export function CreateCollectionDialog({ open, onOpenChange, userId, onSuccess }: CreateCollectionDialogProps) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_public: true
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", description: "Name is required." });
      return;
    }

    setProcessing(true);
    try {
      // Generate slug
      let slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!slug) slug = "collection";

      // Ensure uniqueness (simple append)
      const { data: existing } = await supabase.from("collections").select("slug").eq("slug", slug).maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const { error } = await supabase.from("collections").insert({
        owner_id: userId,
        name: formData.name,
        description: formData.description || null,
        is_public: formData.is_public,
        slug: slug
      });

      if (error) throw error;

      toast({ description: "Collection created." });
      setFormData({ name: "", description: "", is_public: true }); // Reset form
      onSuccess();
    } catch (error) {
      console.error("Error creating collection:", error);
      toast({ variant: "destructive", description: "Failed to create collection." });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
          <DialogDescription>
            Create a new collection to organize your favorite buildings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Modernist Gems"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="public" className="flex flex-col space-y-1">
              <span>Public Collection</span>
              <span className="font-normal text-xs text-muted-foreground">Visible to everyone on your profile</span>
            </Label>
            <Switch
              id="public"
              checked={formData.is_public}
              onCheckedChange={(c) => setFormData({...formData, is_public: c})}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={processing}>
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
