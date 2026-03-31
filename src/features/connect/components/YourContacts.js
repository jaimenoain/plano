import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { UserRow } from "./UserRow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users } from "lucide-react";
export function YourContacts() {
    const { user } = useAuth();
    const [following, setFollowing] = useState([]);
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const sortContacts = (contacts) => {
        return [...contacts].sort((a, b) => {
            if (a.is_close_friend === b.is_close_friend) {
                return (a.username || "").localeCompare(b.username || "");
            }
            return a.is_close_friend ? -1 : 1;
        });
    };
    const toggleCloseFriend = async (targetId, currentStatus) => {
        if (!user)
            return;
        // Optimistic update
        setFollowing((prev) => {
            const updated = prev.map((u) => u.id === targetId ? { ...u, is_close_friend: !currentStatus } : u);
            return sortContacts(updated);
        });
        try {
            const { error } = await supabase
                .from("follows")
                .update({ is_close_friend: !currentStatus })
                .eq("follower_id", user.id)
                .eq("following_id", targetId);
            if (error)
                throw error;
        }
        catch (_error) {
            // Revert on error
            setFollowing((prev) => {
                const updated = prev.map((u) => u.id === targetId ? { ...u, is_close_friend: currentStatus } : u);
                return sortContacts(updated);
            });
        }
    };
    useEffect(() => {
        const fetchContacts = async () => {
            if (!user)
                return;
            setLoading(true);
            try {
                // Fetch Following
                const { data: followingRefs } = await supabase
                    .from("follows")
                    .select("following_id, is_close_friend")
                    .eq("follower_id", user.id);
                const refs = (followingRefs ?? []);
                const followingMap = new Map();
                refs.forEach((r) => {
                    followingMap.set(r.following_id, Boolean(r.is_close_friend));
                });
                const followingIds = refs.map((r) => r.following_id);
                if (followingIds.length > 0) {
                    const { data: followingProfiles } = await supabase
                        .from("profiles")
                        .select("id, username, avatar_url")
                        .in("id", followingIds);
                    const mergedFollowing = followingProfiles?.map((p) => ({
                        ...p,
                        is_close_friend: followingMap.get(p.id) || false,
                    })) || [];
                    setFollowing(sortContacts(mergedFollowing));
                }
                else {
                    setFollowing([]);
                }
                // Fetch Followers
                const { data: followerRefs } = await supabase
                    .from("follows")
                    .select("follower_id")
                    .eq("following_id", user.id);
                const followerIds = followerRefs?.map(r => r.follower_id) || [];
                if (followerIds.length > 0) {
                    const { data: followerProfiles } = await supabase
                        .from("profiles")
                        .select("id, username, avatar_url")
                        .in("id", followerIds);
                    setFollowers(followerProfiles || []);
                }
                else {
                    setFollowers([]);
                }
            }
            catch (_error) {
            }
            finally {
                setLoading(false);
            }
        };
        fetchContacts();
    }, [user]);
    if (loading) {
        return _jsx("div", { className: "h-40 flex items-center justify-center", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) });
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("h2", { className: "text-xl font-semibold tracking-tight flex items-center gap-2", children: [_jsx(Users, { className: "h-5 w-5 text-brand-primary" }), "Your Contacts"] }), _jsxs(Tabs, { defaultValue: "following", className: "w-full", children: [_jsxs(TabsList, { className: "w-full max-w-[400px]", children: [_jsxs(TabsTrigger, { value: "following", className: "flex-1", children: ["Following (", following.length, ")"] }), _jsxs(TabsTrigger, { value: "followers", className: "flex-1", children: ["Followers (", followers.length, ")"] })] }), _jsx(TabsContent, { value: "following", className: "mt-4", children: _jsx("div", { className: "bg-surface-card border rounded-xl overflow-hidden", children: _jsx(ScrollArea, { className: "h-[300px] sm:h-[400px]", children: _jsx("div", { className: "p-2 space-y-1", children: following.length > 0 ? following.map(u => (_jsx(UserRow, { user: u, showFollowButton: false, isCloseFriend: u.is_close_friend, onToggleCloseFriend: () => toggleCloseFriend(u.id, !!u.is_close_friend) }, u.id))) : (_jsx("div", { className: "p-8 text-center text-text-secondary", children: "You are not following anyone yet." })) }) }) }) }), _jsx(TabsContent, { value: "followers", className: "mt-4", children: _jsx("div", { className: "bg-surface-card border rounded-xl overflow-hidden", children: _jsx(ScrollArea, { className: "h-[300px] sm:h-[400px]", children: _jsx("div", { className: "p-2 space-y-1", children: followers.length > 0 ? followers.map(u => (_jsx(UserRow, { user: u, showFollowButton: true, isFollower: true }, u.id))) : (_jsx("div", { className: "p-8 text-center text-text-secondary", children: "No followers yet." })) }) }) }) })] })] }));
}
