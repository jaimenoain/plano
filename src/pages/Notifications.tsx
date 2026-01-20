import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, MessageCircle, UserPlus, Loader2, Bell, Calendar, Sparkles, Clock, LogOut, Clapperboard, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn, slugify } from "@/lib/utils";
import { NotificationSettingsDialog } from "@/components/notifications/NotificationSettingsDialog";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  created_at: string;
  type: 'follow' | 'like' | 'comment' | 'new_session'| 'group_invitation' | 'friend_joined' | 'suggest_follow' | 'session_reminder' | 'group_activity' | 'recommendation' | 'join_request' | 'availability';
  is_read: boolean;
  actor_id: string;
  group_id: string | null;
  recommendation_id?: string | null;
  actor: {
    username: string | null;
    avatar_url: string | null;
  };
  resource?: {
    id: string;
    user_id: string;
    user?: {
        username: string | null;
    };
    film?: {
      title: string;
      poster_path: string | null;
      tmdb_id?: number;
      media_type?: string;
    };
  };
  metadata?: { provider_name?: string; status?: string };
  session?: {
    id: string;
    title: string | null;
    session_date: string;
    group_id: string;
    group: {
      name: string;
    }
  };
  group?: {
    name: string;
  }
}

const NOTIFICATION_QUERY = `
  *,
  actor:notifications_actor_id_fkey(username, avatar_url),
  group:notifications_group_id_fkey(name),
  resource:notifications_resource_id_fkey(
    id,
    user_id,
    film:films(title, poster_path, tmdb_id, media_type),
    user:profiles(username)
  ),
  recommendation:notifications_recommendation_id_fkey(
    id,
    status,
    film:films(title, poster_path, tmdb_id, media_type)
  ),
  session:notifications_session_id_fkey(
    id,
    title,
    session_date,
    group_id,
    group:groups(name)
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

      const unreadNotifications = (unreadResult.data as any) || [];
      const readNotifications = (readResult.data as any) || [];

      setNotifications([...unreadNotifications, ...readNotifications]);
      setHasMore(readNotifications.length === 20);

      // Mark unread as read in DB
      if (unreadNotifications.length > 0) {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user!.id)
          .eq('is_read', false);

        if (updateError) {
          console.error("Error marking notifications as read:", updateError);
        }
      }

    } catch (error) {
      console.error("Error fetching notifications:", error);
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

      const moreNotifications = (data as any) || [];
      setNotifications(prev => [...prev, ...moreNotifications]);
      setHasMore(moreNotifications.length === 20);

    } catch (error) {
      console.error("Error loading more notifications:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (['follow', 'friend_joined', 'suggest_follow'].includes(notification.type)) {
      const identifier = notification.actor?.username || notification.actor_id;
      navigate(`/profile/${identifier}`);
    } else if (notification.type === 'group_activity') {
       const identifier = notification.actor?.username || notification.actor_id;
       navigate(`/profile/${identifier}`);
    } else if (notification.type === 'new_session' || notification.type === 'session_reminder') {
       // Link to the specific group where the session is
       const groupId = notification.session?.group_id || notification.group_id;
       if (groupId) navigate(`/groups/${groupId}`);
    } else if (notification.type === 'group_invitation') {
      // Direct link to group
      if (notification.group_id) navigate(`/groups/${notification.group_id}`);
    } else if (notification.type === 'join_request') {
       if (notification.group_id) navigate(`/groups/${notification.group_id}/members`);
    } else if (notification.type === 'recommendation') {
      // const rec = (notification as any).recommendation;
      // if (rec?.status === 'watch_with' && rec.film?.tmdb_id && notification.actor?.username) {
      //   const film = rec.film;
      //   navigate(`/${film.media_type || 'movie'}/${slugify(film.title)}/${film.tmdb_id}/${notification.actor.username}`);
      // } else {
      //   navigate(`/profile?tab=foryou`);
      // }
      navigate(`/profile?tab=foryou`);
    } else if (notification.resource?.id) {
        // if (notification.resource.film?.tmdb_id && notification.resource.user?.username) {
        //     const film = notification.resource.film;
        //     navigate(`/${film.media_type || 'movie'}/${slugify(film.title)}/${film.tmdb_id}/${notification.resource.user.username}`);
        // } else {
            navigate(`/review/${notification.resource.id}`);
        // }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="h-4 w-4 text-blue-500 fill-blue-500" />;
      case 'follow': return <UserPlus className="h-4 w-4 text-green-500 fill-green-500" />;
      case 'new_session': return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'session_reminder': return <Clock className="h-4 w-4 text-orange-500 fill-orange-500" />;
      case 'friend_joined': return <UserPlus className="h-4 w-4 text-blue-400" />;
      case 'suggest_follow': return <Sparkles className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
      case 'group_invitation': return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'join_request': return <UserPlus className="h-4 w-4 text-primary" />;
      case 'group_activity': return <LogOut className="h-4 w-4 text-orange-500" />;
      case 'recommendation': return <Sparkles className="h-4 w-4 text-primary fill-primary" />;
      case 'availability': return <Clapperboard className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getText = (n: Notification) => {
    const actorName = n.actor?.username || "Someone";
    const filmTitle = n.resource?.film?.title || (n as any).recommendation?.film?.title;
    const providerName = n.metadata?.provider_name || "streaming";

    switch (n.type) {
      case 'like': return <span><span className="font-semibold">{actorName}</span> liked your review of <span className="italic">{filmTitle || "a film"}</span></span>;
      case 'comment': return <span><span className="font-semibold">{actorName}</span> commented on your review of <span className="italic">{filmTitle || "a film"}</span></span>;
      case 'group_invitation': 
        const groupName = n.group?.name || "a group";
        return <span><span className="font-semibold">{actorName}</span> added you to <span className="font-semibold">{groupName}</span></span>;
      case 'join_request':
        const requestGroupName = n.group?.name || "a group";
        if (n.metadata?.status === 'accepted') {
          return <span><span className="font-semibold">{actorName}</span> joined <span className="font-semibold">{requestGroupName}</span></span>;
        }
        return <span><span className="font-semibold">{actorName}</span> has requested to join <span className="font-semibold">{requestGroupName}</span></span>;
      case 'group_activity':
        const groupActivityName = n.group?.name || "a group";
        return <span><span className="font-semibold">{actorName}</span> has left the <span className="font-semibold">{groupActivityName}</span> group</span>;
      case 'follow': return <span><span className="font-semibold">{actorName}</span> started following you</span>;
      case 'new_session': 
        const sessionGroupName = n.session?.group?.name || "a group";
        return <span><span className="font-semibold">{actorName}</span> scheduled a session in <span className="font-semibold">{sessionGroupName}</span></span>;
      case 'session_reminder':
        const reminderGroupName = n.session?.group?.name || n.group?.name || "your group";
        return <span>Reminder: You have a session today in <span className="font-semibold">{reminderGroupName}</span>!</span>;
      case 'friend_joined': 
        return <span>Your friend <span className="font-semibold">{actorName}</span> just joined Cineforum!</span>;
      case 'suggest_follow': 
        return <span>Welcome! Follow <span className="font-semibold">{actorName}</span>, who invited you to join.</span>;
      case 'recommendation':
        if ((n as any).recommendation?.status === 'watch_with') {
             return <span><span className="font-semibold">{actorName}</span> wants to watch <span className="italic">{filmTitle || "a film"}</span> with you</span>;
        }
        return <span><span className="font-semibold">{actorName}</span> recommended <span className="italic">{filmTitle || "a film"}</span> for you</span>;
      case 'availability':
        return <span>Good news! <span className="italic font-semibold">{filmTitle || "A film"}</span> is now available on <span className="font-semibold">{providerName}</span></span>;
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
            "flex items-center gap-4 px-4 py-4 border-b border-border/40 cursor-pointer transition-colors hover:bg-secondary/30",
            !n.is_read && "bg-secondary/10"
          )}
        >
          <div className="relative">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={n.actor?.avatar_url || undefined} />
              <AvatarFallback>{n.actor?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm">
              {getIcon(n.type)}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground line-clamp-2">
              {getText(n)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </p>
          </div>

          {!n.is_read && (
            <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
          )}

          {/* TMDB Image Logic Removed */}
          {/* {(n.resource?.film?.poster_path || (n as any).recommendation?.film?.poster_path) && (
            <img 
              src={`https://image.tmdb.org/t/p/w92${n.resource?.film?.poster_path || (n as any).recommendation?.film?.poster_path}`}
              alt="Poster" 
              className="h-12 w-8 object-cover rounded bg-secondary ml-2"
            />
          )} */}
        </div>
      ))}
    </>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
          className="h-10 w-10 rounded-full hover:bg-white/5"
        >
          <Settings className="h-6 w-6" />
        </Button>
      }
    >
      <NotificationSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      <ScrollArea className="h-full pb-20">
        <div className="flex flex-col">
          {notifications.length > 0 ? (
            <>
              {newNotifications.length > 0 && (
                <div className="pb-2">
                  <h3 className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-background/95 backdrop-blur sticky top-0 z-10">
                    New
                  </h3>
                  {renderNotificationList(newNotifications)}
                </div>
              )}
              
              {earlierNotifications.length > 0 && (
                <div>
                   {newNotifications.length > 0 && (
                    <h3 className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-background/95 backdrop-blur sticky top-0 z-10">
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
                    className="w-full text-muted-foreground"
                  >
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    See older notifications
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-lg">No notifications yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                When people interact with you or your reviews, you'll see it here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
