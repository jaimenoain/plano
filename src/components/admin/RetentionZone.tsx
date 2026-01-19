import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardStats } from "@/types/admin";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  formatDistanceToNow,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears
} from "date-fns";

interface RetentionZoneProps {
  data: DashboardStats['retention_analysis'];
}

function getShortTimeSince(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();

  const minutes = differenceInMinutes(now, date);
  if (minutes < 60) return `${minutes}min`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h`;

  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d`;

  const weeks = differenceInWeeks(now, date);
  if (weeks < 4) return `${weeks}w`;

  const months = differenceInMonths(now, date);
  if (months < 12) {
    if (months === 0) return `${weeks}w`;
    return `${months}m`;
  }

  const years = differenceInYears(now, date);
  return `${years}y`;
}

export function RetentionZone({ data }: RetentionZoneProps) {
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Activity Status (Pie Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>User Status</CardTitle>
            <CardDescription>Distribution of user activity levels</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity Breakdown (Bar Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Recency of Active Users</CardTitle>
            <CardDescription>Active 30d users by days since last activity</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis
                  dataKey="day"
                  stroke="#9ca3af"
                  fontSize={12}
                  label={{ value: 'Days Since Last Active', position: 'insideBottom', offset: -5 }}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Bar dataKey="users" fill="#3b82f6" name="Users" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users Facepile */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Active Users</CardTitle>
          <CardDescription>Top 50 most recently online users</CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="flex flex-wrap gap-x-2 gap-y-4">
              {data.recent_users && data.recent_users.length > 0 ? (
                data.recent_users.map((user) => (
                  <div key={user.user_id} className="flex flex-col items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {user.username ? (
                          <Link to={`/profile/${user.username}`}>
                            <Avatar className="h-10 w-10 border border-border cursor-pointer transition-transform hover:scale-110">
                              <AvatarImage src={user.avatar_url || undefined} alt={user.username || "User"} />
                              <AvatarFallback>{user.username?.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
                            </Avatar>
                          </Link>
                        ) : (
                          <Avatar className="h-10 w-10 border border-border cursor-pointer transition-transform hover:scale-110">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.username || "User"} />
                            <AvatarFallback>{user.username?.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
                          </Avatar>
                        )}
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        <p className="font-bold">{user.username || "Anonymous"}</p>
                        <p className="text-muted-foreground">
                          {user.last_online
                            ? formatDistanceToNow(new Date(user.last_online), { addSuffix: true })
                            : "Unknown"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    {user.username ? (
                      <Link
                        to={`/profile/${user.username}`}
                        className="text-[10px] font-medium max-w-[64px] truncate text-center leading-tight hover:underline"
                      >
                        {user.username}
                      </Link>
                    ) : (
                      <span className="text-[10px] font-medium max-w-[64px] truncate text-center leading-tight">
                        {user.username || "User"}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {getShortTimeSince(user.last_online)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent users found.</p>
              )}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
