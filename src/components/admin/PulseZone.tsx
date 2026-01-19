import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/types/admin";
import { Users, UserPlus, Activity, Share2 } from "lucide-react";

interface PulseZoneProps {
  stats: DashboardStats['pulse'];
}

export function PulseZone({ stats }: PulseZoneProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_users}</div>
          <p className="text-xs text-muted-foreground">Lifetime signups</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Users</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.new_users_30d}</div>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
          <p className="text-[10px] text-muted-foreground mt-1">{stats.new_users_24h} in last 24h</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active_users_30d}</div>
          <p className="text-xs text-muted-foreground">{stats.active_users_24h} in last 24h</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Network Density</CardTitle>
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.network_density}</div>
          <p className="text-xs text-muted-foreground">Avg followers per user</p>
        </CardContent>
      </Card>
    </div>
  );
}
