import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/types/admin";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ActivityTrendsZoneProps {
  data: DashboardStats['activity_trends'];
}

const DAU_OPTIONS = [
  { value: 'logs_users', label: 'Logs', color: '#8884d8' },
  { value: 'comments_users', label: 'Comments', color: '#82ca9d' },
  { value: 'likes_users', label: 'Likes', color: '#ffc658' },
  { value: 'votes_users', label: 'Votes', color: '#ff7300' },
  { value: 'visited_users', label: 'Visitors', color: '#ff0000' },
];

const ACTION_OPTIONS = [
  { value: 'logs', label: 'Logs', color: '#8884d8' },
  { value: 'comments', label: 'Comments', color: '#82ca9d' },
  { value: 'likes', label: 'Likes', color: '#ffc658' },
  { value: 'votes', label: 'Votes', color: '#ff7300' },
  { value: 'follows', label: 'Follows', color: '#0ea5e9' }, // sky-500
];

export function ActivityTrendsZone({ data }: ActivityTrendsZoneProps) {
  const [dauFilters, setDauFilters] = useState<string[]>(DAU_OPTIONS.map(o => o.value));
  const [actionFilters, setActionFilters] = useState<string[]>(ACTION_OPTIONS.map(o => o.value));

  return (
    <div className="grid gap-4 grid-cols-1">
      {/* 1. Daily Logins */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Logins (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.logins}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                fontSize={12}
              />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" name="Logins" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 2. DAU Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-normal">Daily Active Users by Feature</CardTitle>
          <ToggleGroup type="multiple" value={dauFilters} onValueChange={setDauFilters} size="sm">
            {DAU_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                aria-label={`Toggle ${option.label}`}
                className="h-8 px-2 text-xs"
              >
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: option.color }} />
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data.dau_by_feature}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                fontSize={12}
              />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              {dauFilters.includes('logs_users') && <Bar dataKey="logs_users" stackId="a" fill="#8884d8" name="Users who Logged" />}
              {dauFilters.includes('comments_users') && <Bar dataKey="comments_users" stackId="a" fill="#82ca9d" name="Users who Commented" />}
              {dauFilters.includes('likes_users') && <Bar dataKey="likes_users" stackId="a" fill="#ffc658" name="Users who Liked" />}
              {dauFilters.includes('votes_users') && <Bar dataKey="votes_users" stackId="a" fill="#ff7300" name="Users who Voted" />}
              {dauFilters.includes('visited_users') && <Line type="monotone" dataKey="visited_users" stroke="#ff0000" strokeWidth={2} dot={false} name="Unique Visitors" />}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. Total Actions (Existing) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-normal">Total Actions (Activity Volume)</CardTitle>
          <ToggleGroup type="multiple" value={actionFilters} onValueChange={setActionFilters} size="sm">
            {ACTION_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                aria-label={`Toggle ${option.label}`}
                className="h-8 px-2 text-xs"
              >
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: option.color }} />
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.actions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              {actionFilters.includes('logs') && <Bar dataKey="logs" stackId="a" fill="#8884d8" name="Total Logs" />}
              {actionFilters.includes('comments') && <Bar dataKey="comments" stackId="a" fill="#82ca9d" name="Total Comments" />}
              {actionFilters.includes('likes') && <Bar dataKey="likes" stackId="a" fill="#ffc658" name="Total Likes" />}
              {actionFilters.includes('votes') && <Bar dataKey="votes" stackId="a" fill="#ff7300" name="Total Votes" />}
              {actionFilters.includes('follows') && <Bar dataKey="follows" stackId="a" fill="#0ea5e9" name="Total Follows" />}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
