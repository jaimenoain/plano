import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/features/admin/types/admin";
import { Users, UserPlus, Activity, Share2, Building2, MessageSquare, Image, AlertCircle } from "lucide-react";

interface PulseZoneProps {
  stats: DashboardStats['pulse'];
}

export function PulseZone({ stats }: PulseZoneProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* User Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_users}</div>
          <p className="text-xs text-text-secondary">Lifetime signups</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Users</CardTitle>
          <UserPlus className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.new_users_30d}</div>
          <p className="text-xs text-text-secondary">Last 30 days</p>
          <p className="text-[10px] text-text-secondary mt-1">{stats.new_users_24h} in last 24h</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Activity className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active_users_30d}</div>
          <p className="text-xs text-text-secondary">{stats.active_users_24h} in last 24h</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Network Density</CardTitle>
          <Share2 className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.network_density}</div>
          <p className="text-xs text-text-secondary">Avg followers per user</p>
        </CardContent>
      </Card>

      {/* Content Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Buildings</CardTitle>
          <Building2 className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_buildings}</div>
          <p className="text-xs text-text-secondary">Database entries</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          <MessageSquare className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_reviews}</div>
          <p className="text-xs text-text-secondary">Logs with content</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
          <Image className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_photos}</div>
          <p className="text-xs text-text-secondary">Buildings with images</p>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
          <AlertCircle className={`h-4 w-4 ${stats.pending_reports > 0 ? "text-red-500" : "text-text-secondary"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.pending_reports > 0 ? "text-red-500" : ""}`}>{stats.pending_reports}</div>
          <p className="text-xs text-text-secondary">Requiring review</p>
        </CardContent>
      </Card>
    </div>
  );
}
