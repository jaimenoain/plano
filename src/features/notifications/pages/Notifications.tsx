import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, MessageCircle, UserPlus, Loader2, Bell, Sparkles, Settings, Users, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { NotificationSettingsDialog } from "@/features/notifications/components/NotificationSettingsDialog";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  created_at: string;
  type: 'follow' | 'like' | 'comment' | 'friend_joined' | 'suggest_follow' | 'recommendation' | 'visit_request' | 'architect_verification';
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
    user?: {
        username: string | null;
    };
    building?: {
      name: string;
    };
  };
  metadata?: { status?: string };
  recommendation?: {
    id?: string;
    status?: string | null;
    building?: { name: string | null } | null;
  } | null;
}

const NOTIFICATION_QUERY = `
  *,
  actor:notifications_actor_id_fkey(username, avatar_url),
  architect:architects(name),
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

    if (user) {
      fetchNotifications();
    }
  }, [user, authLoading, navigate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Fetch unread notifications
      const unreadPromise = supabase
        .from('notifications')
        .select(NOTIFICATION_QUERY)
        .eq('user_id', user!.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      // Fetch first 20 read notifications
      const readPromise = supabase
        .from('notifications')
        .select(NOTIFICATION_QUERY)
        .eq('user_id', user!.id)
        .eq('is_read', true)
        .order('created_at', { ascending: false })
        .limit(20);

      const [unreadResult, readResult] = await Promise.all([unreadPromise, readPromise]);

      if (unreadResult.error) throw unreadResult.error;
      if (readResult.error) throw readResult.error;

      const unreadNotifications = (unreadResult.data ?? []) as Notification[];
      const readNotifications = (readResult.data ?? []) as Notification[];

      setNotifications([...unreadNotifications, ...readNotifications]);
      setHasMore(readNotifications.length === 20);

      // Mark unread as read in DB
      if (unreadNotifications.length > 0) {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user!.id)
          .eq('is_read', false);

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
        .from('notifications')
        .select(NOTIFICATION_QUERY)
        .eq('user_id', user!.id)
        .eq('is_read', true)
        .lt('created_at', lastNotification.created_at)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const moreNotifications = (data ?? []) as Notification[];
      setNotifications(prev => [...prev, ...moreNotifications]);
      setHasMore(moreNotifications.length === 20);

    } catch (_error) {
} finally {
      setLoadingMore(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (['follow', 'friend_joined', 'suggest_follow'].includes(notification.type)) {
      const identifier = notification.actor?.username || notification.actor_id;
      navigate(`/profile/${identifier}`);
    } else if (notification.type === 'recommendation' || notification.type === 'visit_request') {
      navigate(`/profile?tab=foryou`);
    } else if (notification.type === 'architect_verification' && notification.metadata?.status === 'approved' && notification.architect_id) {
      navigate(`/architect/${notification.architect_id}`);
    } else if (notification.resource?.id) {
        navigate(`/review/${notification.resource.id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="h-4 w-4 text-feedback-destructive fill-feedback-destructive" />;
      case 'comment': return <MessageCircle className="h-4 w-4 text-brand-primary fill-brand-primary" />;
      case 'follow': return <UserPlus className="h-4 w-4 text-feedback-success fill-feedback-success" />;
      case 'friend_joined': return <UserPlus className="h-4 w-4 text-brand-primary" />;
      case 'suggest_follow': return <Sparkles className="h-4 w-4 text-feedback-warning fill-feedback-warning" />;
      case 'recommendation': return <Sparkles className="h-4 w-4 text-brand-primary fill-brand-primary" />;
      case 'visit_request': return <Users className="h-4 w-4 text-brand-primary" />;
      case 'architect_verification': return <ShieldCheck className="h-4 w-4 text-feedback-success" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getText = (n: Notification) => {
    const actorName = n.actor?.username || "Someone";
    const buildingName = n.resource?.building?.name || n.recommendation?.building?.name;

    switch (n.type) {
      case 'architect_verification': {
        const architectName = n.architect?.name || "an architect";
        const isApproved = n.metadata?.status === 'approved';
        return (
          <span>
            Your request to be verified as <span className="font-semibold">{architectName}</span> was{" "}
            <span className={isApproved ? "text-feedback-success font-medium" : "text-feedback-destructive font-medium"}>
              {isApproved ? "approved" : "declined"}
            </span>
          </span>
        );
      }
      case 'like': return <span><span className="font-semibold">{actorName}</span> liked your review of <span className="italic">{buildingName || "a building"}</span></span>;
      case 'comment': return <span><span className="font-semibold">{actorName}</span> commented on your review of <span className="italic">{buildingName || "a building"}</span></span>;
      case 'follow': return <span><span className="font-semibold">{actorName}</span> started following you</span>;
      case 'friend_joined': 
        return <span>Your friend <span className="font-semibold">{actorName}</span> just joined Plano!</span>;
      case 'suggest_follow': 
        return <span>Welcome! Follow <span className="font-semibold">{actorName}</span>, who invited you to join.</span>;
      case 'visit_request':
        return <span><span className="font-semibold">@{actorName}</span> wants to visit <span className="italic">{buildingName || "a building"}</span> with you</span>;
      case 'recommendation':
        if (n.recommendation?.status === 'visit_with') {
             return <span><span className="font-semibold">@{actorName}</span> wants to visit <span className="italic">{buildingName || "a building"}</span> with you</span>;
        }
        return <span><span className="font-semibold">{actorName}</span> recommended <span className="italic">{buildingName || "a building"}</span> for you</span>;
      default: return <span>New notification</span>;
    }
  };

  const renderNotificationList = (list: Notification[]) => (
    <>
      {list.map((n) => (
        <div 
          key={n.id}
          onClick={() => handleNotificationClick(n)}
          className={cn(
            "flex items-center gap-4 px-4 py-4 border-b border-border-default last:border-0 cursor-pointer transition-colors hover:bg-brand-secondary",
            !n.is_read && "bg-brand-secondary"
          )}
        >
          <div className="relative">
            <Avatar className="h-10 w-10 border border-border-default">
              <AvatarImage src={n.actor?.avatar_url || undefined} />
              <AvatarFallback>{n.actor?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-surface-default rounded-sm p-0.5">
              {getIcon(n.type)}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary line-clamp-2">
              {getText(n)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </p>
          </div>

          {!n.is_read && (
            <div className="h-2 w-2 rounded-full bg-brand-primary shrink-0" />
          )}
        </div>
      ))}
    </>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface-default flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  const newNotifications = notifications.filter(n => !n.is_read);
  const earlierNotifications = notifications.filter(n => n.is_read);

  return (
    <AppLayout
      title="Notifications"
      showLogo={false}
      headerAction={
        <Button variant="ghost" size="icon-sm" onClick={() => setShowSettings(true)}>
          <Settings className="h-6 w-6" />
        </Button>
      }
    >
      <NotificationSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      <ScrollArea className="h-full pb-20">
        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto flex flex-col">
          <h1 className="text-4xl font-bold tracking-tight mb-6 text-text-primary">
            Notifications
          </h1>
          {notifications.length > 0 ? (
            <>
              {newNotifications.length > 0 && (
                <div className="pb-2">
                  <h3 className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider bg-surface-card/95 backdrop-blur sticky top-0 z-10">
                    New
                  </h3>
                  {renderNotificationList(newNotifications)}
                </div>
              )}

              {earlierNotifications.length > 0 && (
                <div>
                  {newNotifications.length > 0 && (
                    <h3 className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider bg-surface-card/95 backdrop-blur sticky top-0 z-10">
                      Earlier
                    </h3>
                  )}
                  {renderNotificationList(earlierNotifications)}
                </div>
              )}

              {hasMore && (
                <div className="p-4 flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full text-text-secondary"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2 text-text-secondary" />
                    ) : null}
                    See older notifications
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-4">
              <Bell className="h-12 w-12 text-text-disabled" />
              <h3 className="text-lg font-semibold text-text-primary">No notifications yet</h3>
              <p className="text-sm text-text-secondary max-w-sm">
                When people interact with you or your reviews, you'll see it here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
