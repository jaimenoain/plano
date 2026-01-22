import { useState, useEffect } from "react";
import { Loader2, Send, Link as LinkIcon, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPicker } from "@/components/common/UserPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PersonalRatingButton, BuildingStatus } from "@/components/PersonalRatingButton";

interface RecommendDialogProps {
  building: {
    id: string; // Database UUID
    name: string;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "recommend" | "visit_with";
}

export function RecommendDialog({ building, trigger, open: controlledOpen, onOpenChange: setControlledOpen, mode = "recommend" }: RecommendDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Rating state
  const [userRating, setUserRating] = useState<number | null>(null);
  const [userStatus, setUserStatus] = useState<BuildingStatus>(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  useEffect(() => {
    if (open && user && building.id) {
      fetchUserRating();
    }
  }, [open, user, building.id]);

  const fetchUserRating = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_buildings")
        .select("rating, status")
        .eq("user_id", user.id)
        .eq("building_id", building.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserRating(data.rating);
        setUserStatus(data.status as BuildingStatus);
      } else {
        setUserRating(null);
        setUserStatus(null);
      }
    } catch (error) {
      console.error("Error fetching user rating:", error);
    }
  };

  const handleRate = async (buildingId: string, rating: number) => {
    if (!user) return;
    setRatingLoading(true);
    try {
        const { data: existingLog } = await supabase
            .from("user_buildings")
            .select("id")
            .eq("user_id", user.id)
            .eq("building_id", buildingId)
            .maybeSingle();

        if (existingLog) {
            const { error } = await supabase
                .from("user_buildings")
                .update({ rating })
                .eq("id", existingLog.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("user_buildings")
                .insert({
                    user_id: user.id,
                    building_id: buildingId,
                    rating,
                    status: 'visited', // Default to visited if rating directly
                    visited_at: new Date().toISOString()
                });
            if (error) throw error;
            setUserStatus('visited');
        }
        setUserRating(rating);
        toast({ title: "Rating saved" });
    } catch (error) {
        console.error("Error saving rating:", error);
        toast({ variant: "destructive", title: "Failed to save rating" });
    } finally {
        setRatingLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!profile?.username) return;
    try {
        const url = new URL(window.location.href);
        url.searchParams.set("invited_by", profile.username);

        const textToShare = mode === "visit_with"
            ? `I'd like to visit this building with you! ${url.toString()}`
            : url.toString();

        await navigator.clipboard.writeText(textToShare);
        toast({ title: "Link copied to clipboard" });
    } catch (e) {
        console.error("Failed to copy link", e);
        toast({ variant: "destructive", title: "Failed to copy link" });
    }
  };

  const handleSend = async () => {
    if (!user || selectedUsers.length === 0) return;
    setLoading(true);
    try {
        const status = mode === "visit_with" ? "visit_with" : "pending";

        // Insert recommendation
        const { error: recError } = await supabase
            .from("recommendations")
            .insert(
                selectedUsers.map(recipientId => ({
                    recommender_id: user.id,
                    recipient_id: recipientId,
                    building_id: building.id,
                    status: status
                }))
            );

        if (recError) throw recError;

        const notifications = selectedUsers.map(recipientId => ({
            type: 'recommendation' as const,
            actor_id: user.id,
            user_id: recipientId,
            resource_id: building.id, // Linking to building
        }));

        const { error: notifError } = await supabase
            .from("notifications")
            .insert(notifications);

        if (notifError) throw notifError;

        const actionText = mode === "visit_with" ? "Visit request sent!" : "Recommendation sent!";
        toast({ title: actionText, description: `Sent to ${selectedUsers.length} friend${selectedUsers.length > 1 ? 's' : ''}.` });
        setOpen && setOpen(false);
        setSelectedUsers([]);
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send." });
    } finally {
        setLoading(false);
    }
  };

  const title = mode === "visit_with" ? `Visit "${building.name}" with...` : `Recommend "${building.name}"`;
  const description = mode === "visit_with"
    ? "Select friends to visit this building with."
    : "Who do you think would love this building?";
  const buttonText = mode === "visit_with" ? "Suggest to visit" : "Send Recommendation";
  const ButtonIcon = mode === "visit_with" ? Users : Send;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex justify-between items-start gap-4">
                <p className="text-sm text-muted-foreground flex-1">
                    {description}
                </p>
                {/* Rating Input embedded in the dialog */}
                <div className="shrink-0">
                    <PersonalRatingButton
                        buildingId={building.id}
                        initialRating={userRating}
                        onRate={handleRate}
                        status={userStatus}
                        isPending={ratingLoading}
                        label="Rate"
                    />
                </div>
            </div>

            <UserPicker
                selectedIds={selectedUsers}
                onSelect={(id) => setSelectedUsers([...selectedUsers, id])}
                onRemove={(id) => setSelectedUsers(selectedUsers.filter(uid => uid !== id))}
                modal={true}
            />
            <div className="flex justify-between pt-2">
                <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    disabled={!profile?.username}
                    className="gap-2"
                >
                   <LinkIcon className="h-4 w-4" />
                   Copy Link
                </Button>

                <Button
                    onClick={handleSend}
                    disabled={selectedUsers.length === 0 || loading}
                    className="gap-2"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ButtonIcon className="h-4 w-4" />}
                    {buttonText}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
