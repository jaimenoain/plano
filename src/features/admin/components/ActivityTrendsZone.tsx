import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/features/admin/types/admin";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ActivityTrendsZoneProps {
  data: DashboardStats["activity_trends"];
}

const DAU_OPTIONS = [
  { value: "logs_users", label: "Building logs", dotClass: "bg-brand-primary" },
  { value: "comments_users", label: "Comments", dotClass: "bg-feedback-success" },
  { value: "likes_users", label: "Likes", dotClass: "bg-feedback-warning" },
  { value: "visited_users", label: "Distinct login days", dotClass: "bg-text-secondary" },
] as const;

const ACTION_OPTIONS = [
  { value: "logs", label: "Building logs", colorClass: "bg-brand-primary" },
  { value: "comments", label: "Comments", colorClass: "bg-feedback-success" },
  { value: "likes", label: "Likes", colorClass: "bg-feedback-warning" },
  { value: "follows", label: "Follows", colorClass: "bg-text-secondary" },
];

export function ActivityTrendsZone({ data }: ActivityTrendsZoneProps) {
  const [dauFilters, setDauFilters] = useState<string[]>(DAU_OPTIONS.map((o) => o.value));
  const [actionFilters, setActionFilters] = useState<string[]>(ACTION_OPTIONS.map((o) => o.value));

  return (
    <div className="grid gap-4 grid-cols-1">
      <Card>
        <CardHeader>
          <CardTitle>Login events (last 30 days)</CardTitle>
          <p className="text-sm text-text-secondary">
            Count of login_logs rows per day (same user may appear on multiple days).
          </p>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.logins}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                fontSize={12}
              />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
              <Area type="monotone" dataKey="count" stroke="var(--brand-primary)" fill="var(--brand-primary)" name="Login events" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-normal">Distinct users per day by channel</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Each line is a count of distinct users for that activity type that calendar day (not stacked; lines overlap when
              the same user did multiple things).
            </p>
          </div>
          <ToggleGroup type="multiple" value={dauFilters} onValueChange={setDauFilters} size="sm">
            {DAU_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} aria-label={`Toggle ${option.label}`} className="h-8 px-2 text-xs">
                <span className={`mr-2 h-2 w-2 rounded-full inline-block ${option.dotClass}`} />
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.dau_by_feature}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                fontSize={12}
              />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
              <Legend />
              {dauFilters.includes("logs_users") && (
                <Line type="monotone" dataKey="logs_users" stroke="var(--brand-primary)" strokeWidth={2} dot={false} name="Building logs (users)" />
              )}
              {dauFilters.includes("comments_users") && (
                <Line
                  type="monotone"
                  dataKey="comments_users"
                  stroke="var(--feedback-success)"
                  strokeWidth={2}
                  dot={false}
                  name="Comments (users)"
                />
              )}
              {dauFilters.includes("likes_users") && (
                <Line type="monotone" dataKey="likes_users" stroke="var(--feedback-warning)" strokeWidth={2} dot={false} name="Likes (users)" />
              )}
              {dauFilters.includes("visited_users") && (
                <Line
                  type="monotone"
                  dataKey="visited_users"
                  stroke="var(--text-secondary)"
                  strokeWidth={2}
                  dot={false}
                  name="Distinct users with a login_log row"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-normal">Activity volume (stacked)</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Totals per day: building log rows, comments, likes (review + comment), follows. “Building logs” includes visits,
              saves, ratings, and text logs.
            </p>
          </div>
          <ToggleGroup type="multiple" value={actionFilters} onValueChange={setActionFilters} size="sm">
            {ACTION_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} aria-label={`Toggle ${option.label}`} className="h-8 px-2 text-xs">
                <span className={`mr-2 h-2 w-2 rounded-full ${option.colorClass}`} />
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
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
              <Legend />
              {actionFilters.includes("logs") && <Bar dataKey="logs" stackId="a" fill="var(--brand-primary)" name="Building log rows" />}
              {actionFilters.includes("comments") && <Bar dataKey="comments" stackId="a" fill="var(--feedback-success)" name="Comments" />}
              {actionFilters.includes("likes") && <Bar dataKey="likes" stackId="a" fill="var(--feedback-warning)" name="Likes" />}
              {actionFilters.includes("follows") && <Bar dataKey="follows" stackId="a" fill="var(--text-secondary)" name="Follows" />}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
