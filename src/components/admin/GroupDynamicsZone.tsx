import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardStats } from "@/types/admin";
import { Progress } from "@/components/ui/progress";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GroupDynamicsZoneProps {
  hotGroups: DashboardStats['group_dynamics']['hot_groups'];
  sessionReliability: DashboardStats['group_dynamics']['session_reliability'];
}

export function GroupDynamicsZone({ hotGroups, sessionReliability }: GroupDynamicsZoneProps) {
  const reliabilityPercentage = sessionReliability.published_count > 0
    ? (sessionReliability.completed_count / sessionReliability.published_count) * 100
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Hot Groups Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">New (30d)</TableHead>
                <TableHead className="text-right">Field Trips (30d)</TableHead>
                <TableHead className="text-right">Activity Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotGroups.map((group) => (
                <TableRow key={group.group_id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-right">{group.member_count}</TableCell>
                  <TableCell className="text-right">{group.new_members_30d}</TableCell>
                  <TableCell className="text-right">{group.sessions_30d}</TableCell>
                  <TableCell className="text-right">{group.activity_score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Field Trip Reliability</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Percentage of published field trips that were completed (past date with activity).</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="text-2xl font-bold">
              {Math.round(reliabilityPercentage)}%
            </div>
            <Progress value={reliabilityPercentage} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {sessionReliability.completed_count} completed out of {sessionReliability.published_count} published trips.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
