import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
export function UserLeaderboardZone({ data }) {
    const categories = [
        { title: "Most Reviews", data: data.most_reviews, metric: "reviews" },
        { title: "Most Ratings", data: data.most_ratings, metric: "ratings" },
        { title: "Most Likes", data: data.most_likes, metric: "likes" },
        { title: "Most Comments", data: data.most_comments, metric: "comments" },
        { title: "Most Votes", data: data.most_votes, metric: "votes" },
        { title: "Recently Online", data: data.most_recently_online, metric: "time" },
        { title: "Most Follows", data: data.most_follows_given, metric: "follows" },
        { title: "Most Followers", data: data.most_followers_gained, metric: "followers" },
    ];
    return (_jsx("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5", children: categories.map((category) => (_jsxs(Card, { className: "h-full", children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs(CardTitle, { className: "text-sm font-medium", children: [category.title, _jsx("span", { className: "text-xs font-normal text-text-secondary ml-1", children: "(30d)" })] }) }), _jsx(CardContent, { children: _jsx(ScrollArea, { className: "h-[200px] pr-4", children: _jsx("div", { className: "space-y-4", children: category.data.length === 0 ? (_jsx("p", { className: "text-xs text-text-secondary", children: "No activity recorded." })) : (category.data.map((user, index) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 flex-1 min-w-0", children: [_jsxs("div", { className: "relative", children: [_jsxs(Avatar, { className: "h-8 w-8 border", children: [_jsx(AvatarImage, { src: user.avatar_url || undefined, alt: user.username || "User" }), _jsx(AvatarFallback, { children: user.username?.slice(0, 2).toUpperCase() || "??" })] }), _jsx("div", { className: "absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] text-brand-primary-foreground font-bold shadow-sm ring-1 ring-surface-default", children: index + 1 })] }), _jsx("div", { className: "flex-1 min-w-0", children: _jsx("p", { className: "text-sm font-medium leading-none truncate", children: user.username || "Anonymous" }) })] }), _jsx("div", { className: "text-right", children: _jsx("span", { className: "text-xs font-medium tabular-nums", children: category.metric === "time"
                                                ? user.last_online
                                                    ? formatDistanceToNow(new Date(user.last_online), { addSuffix: true })
                                                    : "N/A"
                                                : user.count }) })] }, user.user_id)))) }) }) })] }, category.title))) }));
}
