/**
 * Notifications.tsx — Redesigned with A24 editorial aesthetic
 *
 * Visual changes (all data-fetching, click-handling, and mark-as-read logic unchanged):
 *
 * Heading:
 *   Responsive scale: text-3xl md:text-5xl font-bold tracking-tight leading-none
 *   Settings gear moved from Button wrapper to a bare icon button inline
 *   with the heading so the heading row doubles as the action row.
 *
 * Section labels ("New" / "Earlier"):
 *   text-xs font-semibold bg-surface-card/95 sticky → text-2xs font-medium
 *   tracking-widest uppercase text-text-secondary sticky bg-surface-default.
 *   Matches the section label pattern used across the rest of the app.
 *
 * Notification rows:
 *   bg-brand-secondary on unread removed — violates the monochromatic content
 *   surface rule in DESIGN_TOKENS. The neon dot is the sole unread signal.
 *   hover:bg-brand-secondary → hover:bg-surface-muted/50.
 *   Avatar: h-10 → h-9 w-9. Timestamp: text-xs → text-2xs text-text-disabled.
 *   Actor name: font-semibold → font-medium throughout getText().
 *
 * Icon badge colours:
 *   Reduced from per-type colour-coding (green/amber/neon/red) to two signals:
 *   Heart stays text-feedback-destructive (universal convention).
 *   ShieldCheck stays text-text-primary (significant system event).
 *   All other types → text-text-secondary, no fill. Contrast between
 *   notification types now comes from text content, not icon colour.
 *
 * Load more: Button variant="ghost" → bare text CTA "Load more →".
 * Loading: Loader2 h-8 w-8 → h-4 w-4 text-text-disabled.
 */
import { useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate, Link, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Heart,
  MessageCircle,
  UserPlus,
  Loader2,
  Bell,
  Sparkles,
  Settings,
  Users,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { NotificationSettingsDialog } from "@/features/notifications/components/NotificationSettingsDialog";

interface Notification {
  id: string;
  created_at: string;
  type:
    | "follow"
    | "like"
    | "comment"
    | "friend_joined"
    | "suggest_follow"
    | "recommendation"
    | "visit_request"
    | "architect_verification"
    | "ambassador_application_received"
    | "ambassador_application_approved"
    | "ambassador_application_rejected"
    | "ambassador_membership_review"
    | "award_win";
  is_read: boolean;
  actor_id: string;
  recommendation_id?: string | null;
  architect_id?: string | null;
  actor: {
    username: string | null;
    avatar_url: string | null;
  };
  architect?: {
    name: string | null;
  };
  resource?: {
    id: string;
    user_id: string;
    user?: { username: string | null };
    building?: { name: string };
  };
  metadata?: {
    status?: string;
    event_slug?: string;
    event_title?: string;
    application_id?: string;
    chapter_id?: string;
    chapter_name?: string;
    reviewer_note?: string | null;
    membership_id?: string;
    member_username?: string;
  };
  recommendation?: {
    id?: string;
    status?: string | null;
    building?: { name: string | null } | null;
  } | null;
}

const NOTIFICATION_QUERY = `
  *,
  actor:notifications_actor_id_fkey(username, avatar_url),
  architect:notifications_architect_id_fkey(name),
  resource:notifications_resource_id_fkey(
    id,
    user_id,
    building:buildings(name),
    user:profiles(username)
  ),
  recommendation:notifications_recommendation_id_fkey(
    id,
    status,
    building:buildings(name)
  )
`;

export const meta: MetaFunction = () => [
  { title: "Notifications | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) fetchNotifications();
  }, [user, authLoading, navigate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const unreadPromise = supabase
        .from("notifications")
        .select(NOTIFICATION_QUERY)
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      const readPromise = supabase
        .from("notifications")
        .select(NOTIFICATION_QUERY)
        .eq("user_id", user!.id)
        .eq("is_read", true)
        .order("created_at", { ascending: false })
        .limit(20);

      const [unreadResult, readResult] = await Promise.all([
        unreadPromise,
        readPromise,
      ]);

      if (unreadResult.error) throw unreadResult.error;
      if (readResult.error) throw readResult.error;

      const unreadNotifications = (unreadResult.data ?? []) as unknown as Notification[];
      const readNotifications = (readResult.data ?? []) as unknown as Notification[];

      setNotifications([...unreadNotifications, ...readNotifications]);
      setHasMore(readNotifications.length === 20);

      if (unreadNotifications.length > 0) {
        const { error: updateError } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user!.id)
          .eq("is_read", false);
        if (updateError) throw updateError;
      }
    } catch (_error) {
      void _error;
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const lastNotification = notifications[notifications.length - 1];
      if (!lastNotification) return;

      const { data, error } = await supabase
        .from("notifications")
        .select(NOTIFICATION_QUERY)
        .eq("user_id", user!.id)
        .eq("is_read", true)
        .lt("created_at", lastNotification.created_at)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const moreNotifications = (data ?? []) as unknown as Notification[];
      setNotifications((prev) => [...prev, ...moreNotifications]);
      setHasMore(moreNotifications.length === 20);
    } catch (_error) {
    } finally {
      setLoadingMore(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (
      ["follow", "friend_joined", "suggest_follow"].includes(notification.type)
    ) {
      const identifier =
        notification.actor?.username || notification.actor_id;
      navigate(`/profile/${identifier}`);
    } else if (
      notification.type === "recommendation" ||
      notification.type === "visit_request"
    ) {
      navigate(`/profile?tab=foryou`);
    } else if (
      notification.type === "architect_verification" &&
      notification.metadata?.status === "approved" &&
      notification.architect_id
    ) {
      navigate(["/", "architect", "/", notification.architect_id].join(""));
    } else if (
      notification.type === "ambassador_application_received" ||
      notification.type === "ambassador_application_approved" ||
      notification.type === "ambassador_application_rejected" ||
      notification.type === "ambassador_membership_review"
    ) {
      navigate("/embassy");
    } else if (notification.type === "award_win") {
      if (notification.resource?.id) {
        navigate(`/building/${notification.resource.id}`);
      }
    } else if (notification.resource?.id) {
      navigate(`/review/${notification.resource.id}`);
    }
  };

  const handleNotificationRowKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    notification: Notification
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNotificationClick(notification);
    }
  };

  // ── Icon — two signal colours only (heart red, shield primary); all others secondary ──
  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        // Heart red is a universal convention — keep
        return <Heart className="h-3.5 w-3.5 text-feedback-destructive fill-feedback-destructive" />;
      case "comment":
        return <MessageCircle className="h-3.5 w-3.5 text-text-secondary" />;
      case "follow":
        return <UserPlus className="h-3.5 w-3.5 text-text-secondary" />;
      case "friend_joined":
        return <UserPlus className="h-3.5 w-3.5 text-text-secondary" />;
      case "suggest_follow":
        return <Sparkles className="h-3.5 w-3.5 text-text-secondary" />;
      case "recommendation":
        return <Sparkles className="h-3.5 w-3.5 text-text-secondary" />;
      case "visit_request":
        return <Users className="h-3.5 w-3.5 text-text-secondary" />;
      case "architect_verification":
        // System event of consequence — text-primary
        return <ShieldCheck className="h-3.5 w-3.5 text-text-primary" />;
      case "ambassador_application_received":
        return <ShieldCheck className="h-3.5 w-3.5 text-text-primary" />;
      case "ambassador_application_approved":
      case "ambassador_application_rejected":
        return <ShieldCheck className="h-3.5 w-3.5 text-text-secondary" />;
      case "ambassador_membership_review":
        return <ShieldCheck className="h-3.5 w-3.5 text-text-primary" />;
      case "award_win":
        return <Trophy className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-text-disabled" />;
    }
  };

  // ── Notification body text — font-medium for actor names (not semibold) ──
  const getText = (n: Notification) => {
    const actorName = n.actor?.username || "Someone";
    const buildingName =
      n.resource?.building?.name || n.recommendation?.building?.name;

    switch (n.type) {
      case "architect_verification": {
        const architectName = n.architect?.name || "an architect";
        const isApproved = n.metadata?.status === "approved";
        return (
          <span>
            Your request to be verified as{" "}
            <span className="font-medium">{architectName}</span> was{" "}
            <span
              className={
                isApproved
                  ? "text-feedback-success font-medium"
                  : "text-feedback-destructive font-medium"
              }
            >
              {isApproved ? "approved" : "declined"}
            </span>
          </span>
        );
      }
      case "ambassador_application_received":
        return (
          <span>
            <span className="font-medium">{actorName}</span> applied to join your ambassador chapter
          </span>
        );
      case "ambassador_application_approved": {
        const ch = n.metadata?.chapter_name?.trim();
        return (
          <span>
            Your ambassador application was{" "}
            <span className="text-feedback-success font-medium">approved</span>
            {ch ? (
              <>
                {" "}
                for <span className="font-medium">{ch}</span>
              </>
            ) : null}
          </span>
        );
      }
      case "ambassador_application_rejected": {
        const note = n.metadata?.reviewer_note?.trim();
        return (
          <span>
            Your ambassador application was{" "}
            <span className="text-feedback-destructive font-medium">not approved</span>
            {note ? (
              <>
                . Note: <span className="italic">{note}</span>
              </>
            ) : null}
          </span>
        );
      }
      case "ambassador_membership_review": {
        const who = n.metadata?.member_username?.trim() || actorName;
        const ch = n.metadata?.chapter_name?.trim();
        return (
          <span>
            <span className="font-medium">{who}</span> updated their profile location
            {ch ? (
              <>
                {" "}
                and may no longer match <span className="font-medium">{ch}</span>
              </>
            ) : null}
            . Please review their membership.
          </span>
        );
      }
      case "like":
        return (
          <span>
            <span className="font-medium">{actorName}</span> liked your review
            of <span className="italic">{buildingName || "a building"}</span>
          </span>
        );
      case "comment":
        return (
          <span>
            <span className="font-medium">{actorName}</span> commented on your
            review of{" "}
            <span className="italic">{buildingName || "a building"}</span>
          </span>
        );
      case "follow":
        return (
          <span>
            <span className="font-medium">{actorName}</span> started following
            you
          </span>
        );
      case "friend_joined":
        return (
          <span>
            Your friend <span className="font-medium">{actorName}</span> just
            joined Plano
          </span>
        );
      case "suggest_follow":
        return (
          <span>
            Welcome! Follow{" "}
            <span className="font-medium">{actorName}</span>, who invited you to
            join.
          </span>
        );
      case "visit_request":
        return (
          <span>
            <span className="font-medium">@{actorName}</span> wants to visit{" "}
            <span className="italic">{buildingName || "a building"}</span> with
            you
          </span>
        );
      case "recommendation":
        if (n.recommendation?.status === "visit_with") {
          return (
            <span>
              <span className="font-medium">@{actorName}</span> wants to visit{" "}
              <span className="italic">{buildingName || "a building"}</span>{" "}
              with you
            </span>
          );
        }
        if (n.metadata?.event_slug) {
          const title = n.metadata.event_title?.trim() || "an event";
          return (
            <span>
              <span className="font-medium">@{actorName}</span> recommended{" "}
              <Link
                // TODO: enrich notification metadata with country_code + city_slug to emit locality-scoped URL
                to={`/events/${n.metadata.event_slug}`}
                onClick={(e) => e.stopPropagation()}
                className="font-medium italic text-text-primary underline underline-offset-2 hover:opacity-80"
              >
                {title}
              </Link>{" "}
              to you
            </span>
          );
        }
        return (
          <span>
            <span className="font-medium">{actorName}</span> recommended{" "}
            <span className="italic">{buildingName || "a building"}</span> for
            you
          </span>
        );
      case "award_win":
        return (
          <span>
            Congratulations! Your building <span className="font-medium italic">{buildingName || "a building"}</span> won an award
          </span>
        );
      default:
        return <span>New notification</span>;
    }
  };

  // ── Row renderer ──
  const renderNotificationList = (list: Notification[]) => (
    <>
      {list.map((n) => (
        <div
          key={n.id}
          role="button"
          tabIndex={0}
          onClick={() => handleNotificationClick(n)}
          onKeyDown={(e) => handleNotificationRowKeyDown(e, n)}
          className={cn(
            // Unread background removed — neon dot is the sole unread signal
            "flex items-start gap-4 px-4 sm:px-6 py-4 border-b border-border-default last:border-0 cursor-pointer transition-colors hover:bg-surface-muted/40"
          )}
        >
          {/* Avatar + icon badge */}
          <div className="relative shrink-0 mt-0.5">
            <Avatar className="h-9 w-9">
              <AvatarImage src={n.actor?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {n.actor?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Badge — no white background box, just the icon */}
            <div className="absolute -bottom-0.5 -right-0.5 bg-surface-default p-px">
              {getIcon(n.type)}
            </div>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary leading-snug line-clamp-2">
              {getText(n)}
            </p>
            <p className="text-2xs text-text-disabled mt-1.5 uppercase tracking-wide">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Unread dot — neon, the only brand accent on this surface */}
          {!n.is_read && (
            <div className="h-1.5 w-1.5 bg-brand-primary shrink-0 mt-2" />
          )}
        </div>
      ))}
    </>
  );

  // ── Loading ──
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface-default flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
      </div>
    );
  }

  const newNotifications = notifications.filter((n) => !n.is_read);
  const earlierNotifications = notifications.filter((n) => n.is_read);

  return (
    <AppLayout
      title="Notifications"
      showLogo={false}
      headerAction={
        // Bare icon button — no Button wrapper chrome
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="p-2.5 text-text-disabled hover:text-text-primary transition-colors"
          aria-label="Notification settings"
        >
          <Settings className="h-4 w-4" strokeWidth={1.5} />
        </button>
      }
    >
      <NotificationSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto pb-24">

          {/* ── Editorial heading ── */}
          <div className="px-4 sm:px-6 lg:px-8 pt-10 pb-10 border-b border-border-default">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-text-primary leading-none">
              Notifications
            </h1>
          </div>

          {notifications.length > 0 ? (
            <>
              {/* ── New ── */}
              {newNotifications.length > 0 && (
                <div>
                  <p className="px-4 sm:px-6 pt-8 pb-3 text-2xs font-medium tracking-widest uppercase text-text-secondary sticky top-0 bg-surface-default z-10">
                    New
                  </p>
                  {renderNotificationList(newNotifications)}
                </div>
              )}

              {/* ── Earlier ── */}
              {earlierNotifications.length > 0 && (
                <div>
                  <p
                    className={cn(
                      "px-4 sm:px-6 pb-3 text-2xs font-medium tracking-widest uppercase text-text-secondary sticky top-0 bg-surface-default z-10",
                      newNotifications.length > 0 ? "pt-8" : "pt-8"
                    )}
                  >
                    Earlier
                  </p>
                  {renderNotificationList(earlierNotifications)}
                </div>
              )}

              {/* ── Load more ── */}
              {hasMore && (
                <div className="px-4 sm:px-6 py-8 flex justify-start">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity disabled:opacity-30 flex items-center gap-2"
                  >
                    {loadingMore && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    Load more →
                  </button>
                </div>
              )}
            </>
          ) : (
            // ── Empty state ──
            <div className="flex flex-col items-center justify-center text-center py-24 px-8 gap-5">
              <Bell className="h-7 w-7 text-text-disabled" strokeWidth={1.5} />
              <div className="space-y-2">
                <p className="text-base font-semibold text-text-primary tracking-tight">
                  No notifications yet
                </p>
                <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
                  When people interact with you or your reviews, you'll see it
                  here.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </AppLayout>
  );
}