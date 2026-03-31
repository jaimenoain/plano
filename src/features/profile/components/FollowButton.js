import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
export function FollowButton({ userId, initialIsFollowing, isFollower, className, hideIfFollowing }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
    const [isLoading, setIsLoading] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    useEffect(() => {
        if (initialIsFollowing !== undefined || !user)
            return;
        const checkStatus = async () => {
            try {
                const { data } = await supabase
                    .from("follows")
                    .select("follower_id")
                    .eq("follower_id", user.id)
                    .eq("following_id", userId)
                    .maybeSingle();
                setIsFollowing(!!data);
            }
            catch (_error) {
            }
        };
        checkStatus();
    }, [userId, user, initialIsFollowing]);
    const handleToggleFollow = async (e) => {
        e.stopPropagation();
        if (!user)
            return;
        if (user.id === userId)
            return;
        setIsLoading(true);
        try {
            if (isFollowing) {
                const { error } = await supabase
                    .from("follows")
                    .delete()
                    .eq("follower_id", user.id)
                    .eq("following_id", userId);
                if (error)
                    throw error;
                setIsFollowing(false);
                toast({ title: "Unfollowed user" });
            }
            else {
                const { error } = await supabase
                    .from("follows")
                    .insert({ follower_id: user.id, following_id: userId });
                if (error)
                    throw error;
                setIsFollowing(true);
                // Notify the user being followed
                await supabase.from("notifications").insert({
                    actor_id: user.id,
                    user_id: userId,
                    type: "follow",
                    is_read: false,
                });
                toast({ title: "Following user" });
                // Trigger PWA interaction check on successful follow
                window.dispatchEvent(new CustomEvent('pwa-interaction'));
            }
        }
        catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Something went wrong"
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    if (!user || user.id === userId)
        return null;
    if (isFollowing && hideIfFollowing)
        return null;
    return (_jsx(Button, { variant: isFollowing ? "secondary" : "default", size: "sm", className: className, onClick: handleToggleFollow, disabled: isLoading, onMouseEnter: () => setIsHovering(true), onMouseLeave: () => setIsHovering(false), children: isFollowing ? (_jsxs(_Fragment, { children: [_jsx(UserCheck, { className: "mr-2 h-4 w-4" }), _jsx("span", { className: isHovering ? "text-feedback-destructive" : undefined, children: isHovering ? "Unfollow" : "Following" })] })) : (_jsxs(_Fragment, { children: [_jsx(UserPlus, { className: "mr-2 h-4 w-4" }), isFollower ? "Follow Back" : "Follow"] })) }));
}
