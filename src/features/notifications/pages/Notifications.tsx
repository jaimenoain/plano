/**
 * Notifications.tsx — the grouped activity feed (kit `notifications.html`).
 *
 * Owns data fetching, click routing and mark-as-read. Row presentation — badge icon, title,
 * body copy and the lime unread square — lives in `components/NotificationRow.tsx`.
 */
import { useEffect, useState } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Settings } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationSettingsDialog } from "../components/NotificationSettingsDialog";
import { NotificationRow } from "../components/NotificationRow";
import type { Notification } from "../types";

const NOTIFICATION_QUERY = `
  *,
  actor:notifications_actor_id_fkey(username, avatar_url),
  resource:notifications_resource_id_fkey(
    id,
    user_id,
    building:buildings(name),
    user:profiles!building_posts_user_id_fkey(username)
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
      navigate("/login");
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
    } catch (error) {
      void error;
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
    } catch (error) {
      void error;
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
      notification.type === "ambassador_membership_review" ||
      notification.type === "project_idea_submitted"
    ) {
      navigate("/embassy");
    } else if (notification.type === "award_win") {
      if (notification.resource?.id) {
        navigate(`/building/${notification.resource.id}`);
      }
    } else if (
      notification.type === "feedback_status_updated" ||
      notification.type === "feedback_notes_updated"
    ) {
      const feedbackId =
        notification.metadata &&
        typeof notification.metadata === "object" &&
        "feedback_id" in notification.metadata
          ? String((notification.metadata as { feedback_id?: string }).feedback_id)
          : null;
      navigate(feedbackId ? `/feedback?open=${feedbackId}` : "/feedback");
    } else if (
      notification.type === "collection_collab_requested" ||
      notification.type === "collection_collab_accepted" ||
      notification.type === "collection_collab_rejected" ||
      notification.type === "collection_collab_added"
    ) {
      // For added/accepted/rejected the actor is the owner, so fall back to the actor's
      // username when metadata.owner_username is absent (direct adds don't store it).
      const ownerUsername = notification.metadata?.owner_username ?? notification.actor?.username;
      const slug = notification.metadata?.collection_slug;
      if (ownerUsername && slug) {
        // The owner receives the request → deep-link to the Collaborators tab so they can act.
        const suffix =
          notification.type === "collection_collab_requested" ? "?settings=collaborators" : "";
        navigate(`/${ownerUsername}/map/${slug}${suffix}`);
      }
    } else if (
      notification.type === "contribution_approved" ||
      notification.type === "contribution_flagged"
    ) {
      const buildingId = notification.metadata?.building_id;
      if (buildingId) navigate(`/building/${buildingId}`);
    } else if (notification.resource?.id) {
      navigate(`/review/${notification.resource.id}`);
    }
  };

  const renderNotificationList = (list: Notification[]) => (
    <>
      {list.map((n) => (
        <NotificationRow key={n.id} notification={n} onSelect={handleNotificationClick} />
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
        <div className="max-w-[1120px] mx-auto pb-24">

          {/* ── Editorial heading ── */}
          <div className="px-4 sm:px-6 pt-11 pb-10 border-b border-border-default">
            <h1 className="headline">Notifications</h1>
          </div>

          {notifications.length > 0 ? (
            <>
              {/* ── New ── */}
              {newNotifications.length > 0 && (
                <div>
                  <p className="eyebrow tracking-widest sticky top-0 z-10 bg-surface-default px-4 pb-3 pt-8 sm:px-6">
                    New
                  </p>
                  {renderNotificationList(newNotifications)}
                </div>
              )}

              {/* ── Earlier ── */}
              {earlierNotifications.length > 0 && (
                <div>
                  <p className="eyebrow tracking-widest sticky top-0 z-10 bg-surface-default px-4 pb-3 pt-8 sm:px-6">
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
                    className="cta-link disabled:opacity-30"
                  >
                    {loadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            // ── Empty state ──
            <EmptyState
              eyebrow="No notifications yet"
              message="When people interact with you or your reviews, you'll see it here."
            />
          )}
        </div>
      </ScrollArea>
    </AppLayout>
  );
}