import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchAdminDashboardStats } from "@/features/admin/api/admin";
import { BottomNav } from "@/components/layout/BottomNav";
import { PulseZone } from "@/features/admin/components/PulseZone";
import { ActivityTrendsZone } from "@/features/admin/components/ActivityTrendsZone";
import { ContentIntelligenceZone } from "@/features/admin/components/ContentIntelligenceZone";
import { UserLeaderboardZone } from "@/features/admin/components/UserLeaderboardZone";
import { RetentionZone } from "@/features/admin/components/RetentionZone";
import { SessionDiagnosticZone } from "@/features/admin/components/SessionDiagnosticZone";
import { NotificationIntelligenceZone } from "@/features/admin/components/NotificationIntelligenceZone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchAdminDashboardStats();
                setStats(data);
            }
            catch (_error) {
            }
            finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-surface-default flex items-center justify-center", children: _jsx("p", { className: "text-text-secondary", children: "Loading dashboard..." }) }));
    }
    if (!stats) {
        return (_jsx("div", { className: "min-h-screen bg-surface-default flex items-center justify-center", children: _jsx("p", { className: "text-feedback-destructive", children: "Failed to load dashboard data." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-surface-default pb-20", children: [_jsxs("div", { className: "container p-4 sm:p-6 lg:p-8 space-y-8", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("h1", { className: "text-3xl font-bold text-text-primary", children: "Admin Dashboard" }) }), _jsxs(Tabs, { defaultValue: "overview", className: "space-y-4", children: [_jsx(TabsList, { children: _jsx(TabsTrigger, { value: "overview", children: "Overview" }) }), _jsxs(TabsContent, { value: "overview", className: "space-y-4", children: [_jsxs("section", { className: "space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold tracking-tight text-text-primary", children: "The Pulse" }), _jsx(PulseZone, { stats: stats.pulse })] }), _jsxs("section", { className: "mt-12 pt-8 border-t border-border-default space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold tracking-tight text-text-primary", children: "User Retention" }), _jsx(RetentionZone, { data: stats.retention_analysis })] }), _jsxs("section", { className: "mt-12 pt-8 border-t border-border-default space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold tracking-tight text-text-primary", children: "Activity Trends" }), _jsx(ActivityTrendsZone, { data: stats.activity_trends })] }), _jsxs("section", { className: "mt-12 pt-8 border-t border-border-default space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold tracking-tight text-text-primary", children: "Content Intelligence" }), _jsx(ContentIntelligenceZone, { trendingBuildings: stats.content_intelligence.trending_buildings })] }), _jsxs("section", { className: "mt-12 pt-8 border-t border-border-default space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold tracking-tight text-text-primary", children: "Notification Intelligence" }), _jsx(NotificationIntelligenceZone, { data: stats.notification_intelligence })] }), _jsxs("section", { className: "mt-12 pt-8 border-t border-border-default space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold tracking-tight text-text-primary", children: "User Leaderboard" }), _jsx(UserLeaderboardZone, { data: stats.user_leaderboard })] }), _jsx("section", { className: "mt-12 pt-8 border-t border-border-default space-y-4", children: _jsx(SessionDiagnosticZone, {}) })] })] })] }), _jsx(BottomNav, {})] }));
}
