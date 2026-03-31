import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Link } from "react-router-dom";
import { MutualFacepile } from "@/features/connect/components/MutualFacepile";
import { X } from "lucide-react";
export function PeopleYouMayKnow() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: suggestions, isLoading } = useQuery({
        queryKey: ["people-you-may-know", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_people_you_may_know", {
                p_limit: 5
            });
            if (error)
                throw error;
            if (!data || data.length === 0 || !user)
                return data || [];
            // Fetch mutual follows details
            const suggestionIds = data.map((s) => s.id);
            // Get my following list first to filter mutuals
            const { data: followingData } = await supabase
                .from("follows")
                .select("following_id")
                .eq("follower_id", user.id);
            const myFollowingIds = followingData?.map(f => f.following_id) || [];
            if (myFollowingIds.length === 0) {
                return data.map((s) => ({ ...s, mutual_follows: [] }));
            }
            const { data: mutualsData } = await supabase
                .from('follows')
                .select(`
          following_id,
          follower:profiles!follows_follower_id_fkey(id, username, avatar_url)
        `)
                .in('following_id', suggestionIds)
                .in('follower_id', myFollowingIds);
            const mutualRows = (mutualsData ?? []);
            return data.map((s) => {
                const mutuals = mutualRows
                    .filter((m) => m.following_id === s.id)
                    .map((m) => {
                    const f = m.follower;
                    return Array.isArray(f) ? f[0] : f;
                })
                    .filter((f) => f != null);
                return { ...s, mutual_follows: mutuals };
            });
        },
        enabled: !!user,
    });
    const hideMutation = useMutation({
        mutationFn: async (suggestedId) => {
            if (!user)
                return;
            const { error } = await supabase
                .from("suggested_profile_hides")
                .insert({
                user_id: user.id,
                suggested_user_id: suggestedId
            });
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["people-you-may-know"] });
        }
    });
    if (isLoading || !suggestions || suggestions.length === 0)
        return null;
    return (_jsxs("div", { className: "p-6 border border-border-default rounded-sm bg-surface-card shadow-none space-y-4 max-w-full w-full overflow-hidden", children: [_jsx("h3", { className: "font-semibold text-text-primary", children: "People you may know" }), _jsx("div", { className: "flex overflow-x-auto gap-4 pb-4 px-1 snap-x hide-scrollbar", children: suggestions.map((person) => (_jsxs("div", { className: "relative flex flex-col items-center justify-between gap-3 min-w-[200px] max-w-[200px] snap-center p-4 border rounded-lg bg-surface-default/50 shrink-0 h-full group", children: [_jsx("button", { onClick: (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                hideMutation.mutate(person.id);
                            }, className: "absolute top-1 right-1 p-1 text-text-secondary/30 hover:text-text-primary hover:bg-surface-muted rounded-full transition-colors z-10", title: "Hide suggestion", children: _jsx(X, { className: "h-4 w-4" }) }), _jsxs(Link, { to: `/profile/${person.username || person.id}`, className: "flex flex-col items-center gap-2 hover:opacity-80 transition-opacity w-full text-center", children: [_jsxs(Avatar, { className: "h-14 w-14 mb-1 border-2 border-surface-default shadow-sm", children: [_jsx(AvatarImage, { src: person.avatar_url || undefined }), _jsx(AvatarFallback, { children: person.username?.[0]?.toUpperCase() })] }), _jsxs("div", { className: "flex flex-col items-center w-full min-w-0 gap-1", children: [_jsx("span", { className: "text-sm font-semibold leading-none truncate w-full", children: person.username }), _jsxs("div", { className: "flex flex-col items-center text-xs text-text-secondary w-full gap-0.5", children: [person.mutual_follows && person.mutual_follows.length > 0 ? (_jsx("div", { className: "scale-90 origin-top w-full flex justify-center", children: _jsx(MutualFacepile, { users: person.mutual_follows, className: "justify-center w-full" }) })) : (_jsx("div", { className: "h-5 flex items-center justify-center w-full", children: (person.mutual_count ?? 0) > 0 && (_jsxs("span", { className: "truncate", children: [person.mutual_count ?? 0, " mutual"] })) })), (person.group_mutual_count ?? 0) > 0 && (_jsxs("span", { className: "truncate w-full text-[10px] text-text-secondary/80", children: [person.group_mutual_count ?? 0, " group", (person.group_mutual_count ?? 0) !== 1 ? 's' : '', " common"] }))] })] })] }), _jsx(FollowButton, { userId: person.id, isFollower: person.is_follows_me, className: "w-full mt-auto bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover rounded-sm" })] }, person.id))) })] }));
}
