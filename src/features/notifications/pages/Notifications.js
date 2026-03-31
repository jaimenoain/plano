import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
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
    const [notifications, setNotifications] = useState([]);
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
                .eq('user_id', user.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false });
            // Fetch first 20 read notifications
            const readPromise = supabase
                .from('notifications')
                .select(NOTIFICATION_QUERY)
                .eq('user_id', user.id)
                .eq('is_read', true)
                .order('created_at', { ascending: false })
                .limit(20);
            const [unreadResult, readResult] = await Promise.all([unreadPromise, readPromise]);
            if (unreadResult.error)
                throw unreadResult.error;
            if (readResult.error)
                throw readResult.error;
            const unreadNotifications = (unreadResult.data ?? []);
            const readNotifications = (readResult.data ?? []);
            setNotifications([...unreadNotifications, ...readNotifications]);
            setHasMore(readNotifications.length === 20);
            // Mark unread as read in DB
            if (unreadNotifications.length > 0) {
                const { error: updateError } = await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false);
                if (updateError)
                    throw updateError;
            }
        }
        catch (_error) {
            void _error;
        }
        finally {
            setLoading(false);
        }
    };
    const handleLoadMore = async () => {
        if (loadingMore || !hasMore)
            return;
        setLoadingMore(true);
        try {
            const lastNotification = notifications[notifications.length - 1];
            if (!lastNotification)
                return;
            const { data, error } = await supabase
                .from('notifications')
                .select(NOTIFICATION_QUERY)
                .eq('user_id', user.id)
                .eq('is_read', true)
                .lt('created_at', lastNotification.created_at)
                .order('created_at', { ascending: false })
                .limit(20);
            if (error)
                throw error;
            const moreNotifications = (data ?? []);
            setNotifications(prev => [...prev, ...moreNotifications]);
            setHasMore(moreNotifications.length === 20);
        }
        catch (_error) {
        }
        finally {
            setLoadingMore(false);
        }
    };
    const handleNotificationClick = (notification) => {
        if (['follow', 'friend_joined', 'suggest_follow'].includes(notification.type)) {
            const identifier = notification.actor?.username || notification.actor_id;
            navigate(`/profile/${identifier}`);
        }
        else if (notification.type === 'recommendation' || notification.type === 'visit_request') {
            navigate(`/profile?tab=foryou`);
        }
        else if (notification.type === 'architect_verification' && notification.metadata?.status === 'approved' && notification.architect_id) {
            navigate(`/architect/${notification.architect_id}`);
        }
        else if (notification.resource?.id) {
            navigate(`/review/${notification.resource.id}`);
        }
    };
    const getIcon = (type) => {
        switch (type) {
            case 'like': return _jsx(Heart, { className: "h-4 w-4 text-feedback-destructive fill-feedback-destructive" });
            case 'comment': return _jsx(MessageCircle, { className: "h-4 w-4 text-brand-primary fill-brand-primary" });
            case 'follow': return _jsx(UserPlus, { className: "h-4 w-4 text-feedback-success fill-feedback-success" });
            case 'friend_joined': return _jsx(UserPlus, { className: "h-4 w-4 text-brand-primary" });
            case 'suggest_follow': return _jsx(Sparkles, { className: "h-4 w-4 text-feedback-warning fill-feedback-warning" });
            case 'recommendation': return _jsx(Sparkles, { className: "h-4 w-4 text-brand-primary fill-brand-primary" });
            case 'visit_request': return _jsx(Users, { className: "h-4 w-4 text-brand-primary" });
            case 'architect_verification': return _jsx(ShieldCheck, { className: "h-4 w-4 text-feedback-success" });
            default: return _jsx(Bell, { className: "h-4 w-4" });
        }
    };
    const getText = (n) => {
        const actorName = n.actor?.username || "Someone";
        const buildingName = n.resource?.building?.name || n.recommendation?.building?.name;
        switch (n.type) {
            case 'architect_verification': {
                const architectName = n.architect?.name || "an architect";
                const isApproved = n.metadata?.status === 'approved';
                return (_jsxs("span", { children: ["Your request to be verified as ", _jsx("span", { className: "font-semibold", children: architectName }), " was", " ", _jsx("span", { className: isApproved ? "text-feedback-success font-medium" : "text-feedback-destructive font-medium", children: isApproved ? "approved" : "declined" })] }));
            }
            case 'like': return _jsxs("span", { children: [_jsx("span", { className: "font-semibold", children: actorName }), " liked your review of ", _jsx("span", { className: "italic", children: buildingName || "a building" })] });
            case 'comment': return _jsxs("span", { children: [_jsx("span", { className: "font-semibold", children: actorName }), " commented on your review of ", _jsx("span", { className: "italic", children: buildingName || "a building" })] });
            case 'follow': return _jsxs("span", { children: [_jsx("span", { className: "font-semibold", children: actorName }), " started following you"] });
            case 'friend_joined':
                return _jsxs("span", { children: ["Your friend ", _jsx("span", { className: "font-semibold", children: actorName }), " just joined Plano!"] });
            case 'suggest_follow':
                return _jsxs("span", { children: ["Welcome! Follow ", _jsx("span", { className: "font-semibold", children: actorName }), ", who invited you to join."] });
            case 'visit_request':
                return _jsxs("span", { children: [_jsxs("span", { className: "font-semibold", children: ["@", actorName] }), " wants to visit ", _jsx("span", { className: "italic", children: buildingName || "a building" }), " with you"] });
            case 'recommendation':
                if (n.recommendation?.status === 'visit_with') {
                    return _jsxs("span", { children: [_jsxs("span", { className: "font-semibold", children: ["@", actorName] }), " wants to visit ", _jsx("span", { className: "italic", children: buildingName || "a building" }), " with you"] });
                }
                return _jsxs("span", { children: [_jsx("span", { className: "font-semibold", children: actorName }), " recommended ", _jsx("span", { className: "italic", children: buildingName || "a building" }), " for you"] });
            default: return _jsx("span", { children: "New notification" });
        }
    };
    const renderNotificationList = (list) => (_jsx(_Fragment, { children: list.map((n) => (_jsxs("div", { onClick: () => handleNotificationClick(n), className: cn("flex items-center gap-4 px-4 py-4 border-b border-border-default last:border-0 cursor-pointer transition-colors hover:bg-surface-muted/30", !n.is_read && "bg-surface-muted/10"), children: [_jsxs("div", { className: "relative", children: [_jsxs(Avatar, { className: "h-10 w-10 border border-border-default", children: [_jsx(AvatarImage, { src: n.actor?.avatar_url || undefined }), _jsx(AvatarFallback, { children: n.actor?.username?.charAt(0).toUpperCase() })] }), _jsx("div", { className: "absolute -bottom-1 -right-1 bg-surface-default rounded-sm p-0.5", children: getIcon(n.type) })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm text-text-primary line-clamp-2", children: getText(n) }), _jsx("p", { className: "text-xs text-text-secondary mt-1", children: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) })] }), !n.is_read && (_jsx("div", { className: "h-2 w-2 rounded-full bg-brand-primary shrink-0" }))] }, n.id))) }));
    if (authLoading || loading) {
        return (_jsx("div", { className: "min-h-screen bg-surface-default flex items-center justify-center", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-text-secondary" }) }));
    }
    const newNotifications = notifications.filter(n => !n.is_read);
    const earlierNotifications = notifications.filter(n => n.is_read);
    return (_jsxs(AppLayout, { title: "Notifications", showLogo: false, headerAction: _jsx(Button, { variant: "ghost", size: "icon-sm", onClick: () => setShowSettings(true), children: _jsx(Settings, { className: "h-6 w-6" }) }), children: [_jsx(NotificationSettingsDialog, { open: showSettings, onOpenChange: setShowSettings }), _jsx(ScrollArea, { className: "h-full pb-20", children: _jsxs("div", { className: "p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto flex flex-col", children: [_jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary", children: "Notifications" }), notifications.length > 0 ? (_jsxs(_Fragment, { children: [newNotifications.length > 0 && (_jsxs("div", { className: "pb-2", children: [_jsx("h3", { className: "px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider bg-surface-card/95 backdrop-blur sticky top-0 z-10", children: "New" }), renderNotificationList(newNotifications)] })), earlierNotifications.length > 0 && (_jsxs("div", { children: [newNotifications.length > 0 && (_jsx("h3", { className: "px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider bg-surface-card/95 backdrop-blur sticky top-0 z-10", children: "Earlier" })), renderNotificationList(earlierNotifications)] })), hasMore && (_jsx("div", { className: "p-4 flex justify-center", children: _jsxs(Button, { variant: "ghost", onClick: handleLoadMore, disabled: loadingMore, className: "w-full text-text-secondary", children: [loadingMore ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2 text-text-secondary" })) : null, "See older notifications"] }) }))] })) : (_jsxs("div", { className: "flex flex-col items-center justify-center text-center py-16 px-8 gap-4", children: [_jsx(Bell, { className: "h-12 w-12 text-text-disabled" }), _jsx("h3", { className: "text-lg font-semibold text-text-primary", children: "No notifications yet" }), _jsx("p", { className: "text-sm text-text-secondary max-w-sm", children: "When people interact with you or your reviews, you'll see it here." })] }))] }) })] }));
}
