import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from "date-fns";
function getShortTimeSince(dateStr) {
    if (!dateStr)
        return '';
    const date = new Date(dateStr);
    const now = new Date();
    const minutes = differenceInMinutes(now, date);
    if (minutes < 60)
        return `${minutes}min`;
    const hours = differenceInHours(now, date);
    if (hours < 24)
        return `${hours}h`;
    const days = differenceInDays(now, date);
    if (days < 7)
        return `${days}d`;
    const weeks = differenceInWeeks(now, date);
    if (weeks < 4)
        return `${weeks}w`;
    const months = differenceInMonths(now, date);
    if (months < 12) {
        if (months === 0)
            return `${weeks}w`;
        return `${months}m`;
    }
    const years = differenceInYears(now, date);
    return `${years}y`;
}
export function RetentionZone({ data }) {
    const pieData = [
        { name: 'Active 30d', value: data.user_activity_distribution.active_30d, color: '#22c55e' }, // green-500
        { name: 'Active 90d', value: data.user_activity_distribution.active_90d, color: '#f59e0b' }, // amber-500
        { name: 'Inactive', value: data.user_activity_distribution.inactive, color: '#ef4444' }, // red-500
    ];
    // Fill in missing days for the bar chart (0-29)
    const barData = Array.from({ length: 30 }, (_, i) => {
        const found = data.active_30d_breakdown.find(d => d.days_since_active === i);
        return {
            day: i,
            users: found ? found.user_count : 0,
        };
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "User Status" }), _jsx(CardDescription, { children: "Distribution of user activity levels" })] }), _jsx(CardContent, { className: "h-[300px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: pieData, cx: "50%", cy: "50%", labelLine: false, label: ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`, outerRadius: 80, fill: "#8884d8", dataKey: "value", children: pieData.map((entry, index) => (_jsx(Cell, { fill: entry.color }, `cell-${index}`))) }), _jsx(RechartsTooltip, {}), _jsx(Legend, {})] }) }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Recency of Active Users" }), _jsx(CardDescription, { children: "Active 30d users by days since last activity" })] }), _jsx(CardContent, { className: "h-[300px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: barData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "#374151" }), _jsx(XAxis, { dataKey: "day", stroke: "#9ca3af", fontSize: 12, label: { value: 'Days Since Last Active', position: 'insideBottom', offset: -5 } }), _jsx(YAxis, { stroke: "#9ca3af", fontSize: 12 }), _jsx(RechartsTooltip, { contentStyle: { backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }, itemStyle: { color: '#f3f4f6' } }), _jsx(Bar, { dataKey: "users", fill: "#3b82f6", name: "Users", radius: [4, 4, 0, 0] })] }) }) })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Recently Active Users" }), _jsx(CardDescription, { children: "Top 50 most recently online users" })] }), _jsx(CardContent, { children: _jsx(TooltipProvider, { children: _jsx("div", { className: "flex flex-wrap gap-x-2 gap-y-4", children: data.recent_users && data.recent_users.length > 0 ? (data.recent_users.map((user) => (_jsxs("div", { className: "flex flex-col items-center gap-0.5", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: user.username ? (_jsx(Link, { to: `/profile/${user.username}`, children: _jsxs(Avatar, { className: "h-10 w-10 border border-border-default cursor-pointer transition-transform hover:scale-110", children: [_jsx(AvatarImage, { src: user.avatar_url || undefined, alt: user.username || "User" }), _jsx(AvatarFallback, { children: user.username?.slice(0, 2).toUpperCase() || "??" })] }) })) : (_jsxs(Avatar, { className: "h-10 w-10 border border-border-default cursor-pointer transition-transform hover:scale-110", children: [_jsx(AvatarImage, { src: user.avatar_url || undefined, alt: user.username || "User" }), _jsx(AvatarFallback, { children: user.username?.slice(0, 2).toUpperCase() || "??" })] })) }), _jsxs(TooltipContent, { className: "text-xs", children: [_jsx("p", { className: "font-bold", children: user.username || "Anonymous" }), _jsx("p", { className: "text-text-secondary", children: user.last_online
                                                                ? formatDistanceToNow(new Date(user.last_online), { addSuffix: true })
                                                                : "Unknown" })] })] }), user.username ? (_jsx(Link, { to: `/profile/${user.username}`, className: "text-[10px] font-medium max-w-[64px] truncate text-center leading-tight hover:underline", children: user.username })) : (_jsx("span", { className: "text-[10px] font-medium max-w-[64px] truncate text-center leading-tight", children: user.username || "User" })), _jsx("span", { className: "text-[10px] text-text-secondary font-medium", children: getShortTimeSince(user.last_online) })] }, user.user_id)))) : (_jsx("p", { className: "text-sm text-text-secondary", children: "No recent users found." })) }) }) })] })] }));
}
