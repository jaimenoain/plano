import { useState, useEffect } from "react";
import { Loader2, Send, Link as LinkIcon, Users, Building2 } from "lucide-react";
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
    image_url?: string | null;
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
      // @ts-ignore - log table exists, user_buildings does not
      const { data, error } = await supabase
        .from("log")
        .select("rating, status")
        .eq("user_id", user.id)
        .eq("film_id", building.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserRating(data.rating);
        let status: BuildingStatus = null;
        if (data.status === 'watchlist') status = 'pending';
        else if (data.status === 'watched') status = 'visited';
        setUserStatus(status);
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
        // @ts-ignore
        const { data: existingLog } = await supabase
            .from("log")
            .select("id")
            .eq("user_id", user.id)
            .eq("film_id", buildingId)
            .maybeSingle();

        if (existingLog) {
            // @ts-ignore
            const { error } = await supabase
                .from("log")
                .update({ rating })
                .eq("id", existingLog.id);
            if (error) throw error;
        } else {
            // @ts-ignore
            const { error } = await supabase
                .from("log")
                .insert({
                    user_id: user.id,
                    film_id: buildingId,
                    rating,
                    status: 'watched', // Default to watched if rating directly
                    updated_at: new Date().toISOString()
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
        const { data: recommendations, error: recError } = await supabase
            .from("recommendations")
            .insert(
                selectedUsers.map(recipientId => ({
                    recommender_id: user.id,
                    recipient_id: recipientId,
                    building_id: building.id,
                    status: status
                }))
            )
            .select();

        if (recError) throw recError;

        if (recommendations) {
            const notifications = recommendations.map(rec => ({
                type: (mode === 'visit_with' ? 'visit_request' : 'recommendation') as "visit_request" | "recommendation",
                actor_id: user.id,
                user_id: rec.recipient_id,
                resource_id: building.id, // Linking to building (legacy/fallback)
                recommendation_id: rec.id
            }));

            const { error: notifError } = await supabase
                .from("notifications")
                .insert(notifications);

            if (notifError) throw notifError;
        }

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
            {/* Building Preview with Image */}
            <div className="flex gap-4 items-center bg-muted/30 p-3 rounded-lg border">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-background flex items-center justify-center text-muted-foreground">
                {building.image_url ? (
                  <img src={building.image_url} alt={building.name} className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8 opacity-50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{building.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              </div>
            </div>

            <div className="flex justify-between items-center gap-4">
                <p className="text-sm font-medium">{userStatus === 'pending' ? 'Your Priority' : 'Your Rating'}</p>
                <PersonalRatingButton
                    buildingId={building.id}
                    initialRating={userRating}
                    onRate={handleRate}
                    status={userStatus}
                    isLoading={ratingLoading}
                    label={userStatus === 'pending' ? "Priority" : "Rate"}
                />
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
