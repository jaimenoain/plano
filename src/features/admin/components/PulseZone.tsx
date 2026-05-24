import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/features/admin/types/admin";
import { Users, UserPlus, Activity, Share2, Building2, MessageSquare, Image, AlertCircle } from "lucide-react";

interface PulseZoneProps {
  stats: DashboardStats["pulse"];
}

export function PulseZone({ stats }: PulseZoneProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* User Metrics */}
      <Card className="border-border-default shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Total users</CardTitle>
          <Users className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_users}</div>
          <p className="text-xs text-text-secondary">Excludes test and admin accounts</p>
        </CardContent>
      </Card>

      <Card className="border-border-default shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">New Users</CardTitle>
          <UserPlus className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.new_users_30d}</div>
          <p className="text-xs text-text-secondary">Last 30 days</p>
          <p className="text-[10px] text-text-secondary mt-1">{stats.new_users_24h} in last 24h</p>
        </CardContent>
      </Card>

      <Card className="border-border-default shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Active Users</CardTitle>
          <Activity className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active_users_30d}</div>
          <p className="text-xs text-text-secondary">
            Distinct users with building log, comment, like, or comment-like in window
          </p>
          <p className="text-[10px] text-text-secondary mt-1">{stats.active_users_24h} in last 24h</p>
        </CardContent>
      </Card>

      <Card className="border-border-default shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Network Density</CardTitle>
          <Share2 className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.network_density}</div>
          <p className="text-xs text-text-secondary">Follow edges ÷ users (test/admin excluded)</p>
        </CardContent>
      </Card>

      {/* Content Metrics */}
      <Card className="border-border-default shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Total Buildings</CardTitle>
          <Building2 className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_buildings}</div>
          <p className="text-xs text-text-secondary">Non-deleted rows</p>
        </CardContent>
      </Card>

      <Card className="border-border-default shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Text logs</CardTitle>
          <MessageSquare className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_reviews}</div>
          <p className="text-xs text-text-secondary">
            User-building rows with non-empty text (all visibilities; test/admin excluded)
          </p>
        </CardContent>
      </Card>

      <Card className="border-border-default shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Buildings with hero image</CardTitle>
          <Image className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_photos}</div>
          <p className="text-xs text-text-secondary">Non-deleted buildings with non-empty hero_image_url</p>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="border-border-default shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Pending Reports</CardTitle>
          <AlertCircle className={`h-4 w-4 ${stats.pending_reports > 0 ? "text-feedback-destructive" : "text-text-secondary"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.pending_reports > 0 ? "text-feedback-destructive" : ""}`}>{stats.pending_reports}</div>
          <p className="text-xs text-text-secondary">User reports awaiting review</p>
        </CardContent>
      </Card>
    </div>
  );
}
