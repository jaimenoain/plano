import { useEffect, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2, Send, Link as LinkIcon, Users, Building2, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPicker } from "@/components/common/UserPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { PersonalRatingButton, BuildingStatus } from "@/features/buildings";
import type { EventCardDTO } from "@/features/events/types";
import { eventKeys } from "@/features/events/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

const attendanceClient = supabase as unknown as SupabaseClient;

export type RecommendTargetMode = "building" | "event";

export interface RecommendDialogProps {
  /** What is being recommended — building (default) or community event. */
  mode?: RecommendTargetMode;
  /** Required when `mode` is `"building"` (default). */
  building?: {
    id: string;
    name: string;
    image_url?: string | null;
  } | null;
  /** Required when `mode` is `"event"`. */
  event?: EventCardDTO | null;
  /** `recommend` (default) or `visit_with` (buildings only). */
  intent?: "recommend" | "visit_with";
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function formatEventWhen(iso: string): string {
  try {
    return format(parseISO(iso), "EEE d MMM · HH:mm", { locale: enGB });
  } catch {
    return "";
  }
}

export function RecommendDialog({
  mode = "building",
  building = null,
  event = null,
  intent: intentProp,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: RecommendDialogProps) {
  const intent = intentProp ?? "recommend";
  const isEvent = mode === "event";
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [markGoingToo, setMarkGoingToo] = useState(false);

  const [userRating, setUserRating] = useState<number | null>(null);
  const [userStatus, setUserStatus] = useState<BuildingStatus>(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const handleOpenChange = (next: boolean) => {
    if (isControlled) setControlledOpen?.(next);
    else setInternalOpen(next);
  };

  const buildingId = building?.id ?? "";
  const eventRow = isEvent ? event : null;

  useEffect(() => {
    if (!open) {
      setMarkGoingToo(false);
      setSelectedUsers([]);
    }
  }, [open]);

  useEffect(() => {
    if (open && user && !isEvent && buildingId) {
      void fetchUserRating();
    }
  }, [open, user, buildingId, isEvent]);

  const fetchUserRating = async () => {
    if (!user || !buildingId) return;
    try {
      const { data, error } = await supabase
        .from("user_buildings")
        .select("rating, status")
        .eq("user_id", user.id)
        .eq("building_id", buildingId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserRating(data.rating);
        let status: BuildingStatus = null;
        if (data.status === "pending") status = "pending";
        else if (data.status === "visited") status = "visited";
        setUserStatus(status);
      } else {
        setUserRating(null);
        setUserStatus(null);
      }
    } catch {
      setUserRating(null);
      setUserStatus(null);
    }
  };

  const handleRate = async (bId: string, rating: number) => {
    if (!user) return;
    setRatingLoading(true);
    try {
      const { data: existingLog } = await supabase
        .from("user_buildings")
        .select("id")
        .eq("user_id", user.id)
        .eq("building_id", bId)
        .maybeSingle();

      if (existingLog) {
        const { error } = await supabase
          .from("user_buildings")
          .update({ rating })
          .eq("id", existingLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_buildings").insert({
          user_id: user.id,
          building_id: bId,
          rating,
          status: "visited",
        });
        if (error) throw error;
        setUserStatus("visited");
      }
      setUserRating(rating);
      if (rating >= 2) {
        toast({ title: "You just boosted this building's rank!", description: "Thanks for your feedback." });
      } else {
        toast({ title: "Rating saved" });
      }
    } catch {
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

      const textToShare =
        intent === "visit_with"
          ? `I'd like to visit this building with you! ${url.toString()}`
          : url.toString();

      await navigator.clipboard.writeText(textToShare);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({ variant: "destructive", title: "Failed to copy link" });
    }
  };

  const handleSend = async () => {
    if (!user || selectedUsers.length === 0) return;
    setLoading(true);
    try {
      const status = isEvent ? "pending" : intent === "visit_with" ? "visit_with" : "pending";

      if (isEvent) {
        if (!eventRow) throw new Error("Missing event.");
        const { data: recommendations, error: recError } = await supabase
          .from("recommendations")
          .insert(
            selectedUsers.map((recipientId) => ({
              recommender_id: user.id,
              recipient_id: recipientId,
              event_id: eventRow.id,
              building_id: null,
              status,
            })),
          )
          .select();

        if (recError) throw recError;

        if (recommendations?.length) {
          const notifications = recommendations.map((rec) => ({
            type: "recommendation" as const,
            actor_id: user.id,
            user_id: rec.recipient_id,
            resource_id: eventRow.id,
            recommendation_id: rec.id,
            metadata: {
              event_slug: eventRow.slug,
              event_title: eventRow.title,
            },
          }));

          const { error: notifError } = await supabase.from("notifications").insert(notifications);
          if (notifError) throw notifError;
        }

        if (markGoingToo) {
          try {
            const { data: existing, error: findErr } = await attendanceClient
              .from("event_attendances")
              .select("id")
              .eq("event_id", eventRow.id)
              .eq("user_id", user.id)
              .maybeSingle();

            if (findErr) throw findErr;

            if (existing?.id) {
              const { error: upErr } = await attendanceClient
                .from("event_attendances")
                .update({ status: "going" })
                .eq("id", existing.id as string);
              if (upErr) throw upErr;
            } else {
              const { error: insErr } = await attendanceClient.from("event_attendances").insert({
                event_id: eventRow.id,
                user_id: user.id,
                status: "going",
              });
              if (insErr) throw insErr;
            }
          } catch {
            /* silent — recommendation must not roll back */
          }
        }

        await queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventRow.slug) });
        await queryClient.invalidateQueries({ queryKey: eventKeys.profile(user.id, "attending") });

        toast({
          title: "Recommendation sent!",
          description: `Sent to ${selectedUsers.length} friend${selectedUsers.length > 1 ? "s" : ""}.`,
        });
        if (isControlled) setControlledOpen?.(false);
        else setInternalOpen(false);
        setSelectedUsers([]);
      } else {
        if (!building?.id) throw new Error("Missing building.");
        const { data: recommendations, error: recError } = await supabase
          .from("recommendations")
          .insert(
            selectedUsers.map((recipientId) => ({
              recommender_id: user.id,
              recipient_id: recipientId,
              building_id: building.id,
              status,
            })),
          )
          .select();

        if (recError) throw recError;

        if (recommendations) {
          const notifications = recommendations.map((rec) => ({
            type: (intent === "visit_with" ? "visit_request" : "recommendation") as "visit_request" | "recommendation",
            actor_id: user.id,
            user_id: rec.recipient_id,
            resource_id: building.id,
            recommendation_id: rec.id,
          }));

          const { error: notifError } = await supabase.from("notifications").insert(notifications);
          if (notifError) throw notifError;
        }

        const actionText = intent === "visit_with" ? "Visit request sent!" : "Recommendation sent!";
        toast({
          title: actionText,
          description: `Sent to ${selectedUsers.length} friend${selectedUsers.length > 1 ? "s" : ""}.`,
        });
        if (isControlled) setControlledOpen?.(false);
        else setInternalOpen(false);
        setSelectedUsers([]);
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send.",
      });
    } finally {
      setLoading(false);
    }
  };

  const visitWithBuilding = !isEvent && intent === "visit_with";
  const title = isEvent
    ? "Recommend an event"
    : visitWithBuilding
      ? `Visit "${building?.name ?? ""}" with...`
      : `Recommend "${building?.name ?? ""}"`;
  const description = isEvent
    ? "Who do you think would love this event?"
    : visitWithBuilding
      ? "Select friends to visit this building with."
      : "Who do you think would love this building?";
  const buttonText = visitWithBuilding ? "Suggest to visit" : "Send Recommendation";
  const ButtonIcon = visitWithBuilding ? Users : Send;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isEvent && eventRow ? (
            <div className="flex items-center gap-4 rounded-sm border border-border-default bg-surface-muted/30 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-none border border-border-default bg-surface-muted text-text-secondary">
                {eventRow.coverImageUrl ? (
                  <img src={eventRow.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <CalendarDays className="h-8 w-8 opacity-50" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-medium text-text-primary">{eventRow.title}</h4>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{formatEventWhen(eventRow.startAt)}</p>
              </div>
            </div>
          ) : building ? (
            <div className="flex items-center gap-4 rounded-sm border border-border-default bg-surface-muted/30 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-none border border-border-default bg-surface-muted text-text-secondary">
                {building.image_url ? (
                  <img src={building.image_url} alt={building.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <Building2 className="h-8 w-8 opacity-50" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-medium">{building.name}</h4>
                <p className="truncate text-xs text-text-secondary">{description}</p>
              </div>
            </div>
          ) : null}

          {!isEvent && building ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">{userStatus === "pending" ? "Your Priority" : "Your Rating"}</p>
              <PersonalRatingButton
                buildingId={building.id}
                initialRating={userRating}
                onRate={handleRate}
                status={userStatus}
                isLoading={ratingLoading}
                label={userStatus === "pending" ? "Priority" : "Rate"}
              />
            </div>
          ) : null}

          {isEvent ? <p className="text-sm text-text-secondary">{description}</p> : null}

          <UserPicker
            selectedIds={selectedUsers}
            onSelect={(id) => setSelectedUsers([...selectedUsers, id])}
            onRemove={(id) => setSelectedUsers(selectedUsers.filter((uid) => uid !== id))}
            modal
          />

          {isEvent ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
              <Checkbox checked={markGoingToo} onCheckedChange={(v) => setMarkGoingToo(v === true)} />
              Mark me as going too
            </label>
          ) : null}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={handleCopyLink} disabled={!profile?.username} className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Copy Link
            </Button>

            <Button onClick={handleSend} disabled={selectedUsers.length === 0 || loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ButtonIcon className="h-4 w-4" />}
              {buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
