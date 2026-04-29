import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/features/admin/types/admin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Bell, BellOff, Eye, EyeOff } from "lucide-react";

interface NotificationIntelligenceZoneProps {
  data: DashboardStats['notification_intelligence'];
}

export function NotificationIntelligenceZone({ data }: NotificationIntelligenceZoneProps) {
  const { engagement, unread_distribution } = data;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read Rate (30d)</CardTitle>
            <Eye className="h-4 w-4 text-text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagement.read_rate.toFixed(1)}%</div>
            <p className="text-xs text-text-secondary">
              of {engagement.total_notifications.toLocaleString()} notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ghost Users</CardTitle>
            <BellOff className="h-4 w-4 text-text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-feedback-warning">
              {engagement.active_users_never_read_percent.toFixed(1)}%
            </div>
            <p className="text-xs text-text-secondary">
              active users never read notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Ignorers</CardTitle>
            <EyeOff className="h-4 w-4 text-text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-feedback-destructive">
              {engagement.active_ignoring_percent.toFixed(1)}%
            </div>
            <p className="text-xs text-text-secondary">
              active while having unread notifications
            </p>
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Zero Unread</CardTitle>
                <Bell className="h-4 w-4 text-text-secondary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-feedback-success">
                    {unread_distribution.find(d => d.bucket === "0")?.count || 0}
                </div>
                <p className="text-xs text-text-secondary">
                    users have cleared all notifications
                </p>
            </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Unread Notifications Distribution</CardTitle>
          <CardDescription>
            How many unread notifications do users accumulate?
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unread_distribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border-default" />
                <XAxis dataKey="bucket" stroke="var(--border-strong)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--border-strong)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius)'
                  }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {unread_distribution.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0
                          ? "var(--feedback-success)"
                          : index === 3
                            ? "var(--feedback-destructive)"
                            : "var(--brand-primary)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
