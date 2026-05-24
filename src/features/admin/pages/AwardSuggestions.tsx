import { useSuggestions } from "@/features/awards/hooks/useAwards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, type MetaFunction } from "react-router";
import { format } from "date-fns";
import { Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageHeader, adminTableHeadClass } from "@/features/admin/components/admin-ui";

export const meta: MetaFunction = () => [{ title: "Award Suggestions | Plano Admin" }];

export default function AwardSuggestions() {
  const { data: suggestions = [], isLoading } = useSuggestions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Awards"
        title="Award suggestions"
        description="Review community-submitted award recipients."
      />

      <div className="overflow-hidden rounded-sm border border-border-default bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border-default bg-surface-muted/50 hover:bg-surface-muted/50">
              <TableHead className={cn(adminTableHeadClass, "w-[180px]")}>Submitted by</TableHead>
              <TableHead className={adminTableHeadClass}>Award / year</TableHead>
              <TableHead className={adminTableHeadClass}>Recipient</TableHead>
              <TableHead className={adminTableHeadClass}>Outcome</TableHead>
              <TableHead className={adminTableHeadClass}>Status</TableHead>
              <TableHead className={cn(adminTableHeadClass, "w-[100px] text-right")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-text-secondary">
                  No suggestions found.
                </TableCell>
              </TableRow>
            ) : (
              suggestions.map((s) => (
                <TableRow
                  key={s.id}
                  className="border-border-default transition-colors hover:bg-surface-muted/30"
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{s.submittedByProfile?.name || "Anonymous"}</span>
                      <span className="text-[10px] text-text-secondary">
                        {format(new Date(s.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{s.award?.name}</span>
                      <span className="text-xs text-text-secondary">{s.year}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {s.recipientType === "building"
                          ? s.building?.name
                          : s.recipientType === "person"
                            ? s.person?.name
                            : s.company?.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                        {s.recipientType}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-none border-border-default text-[10px] capitalize">
                      {s.outcome.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-none text-[10px] uppercase tracking-widest",
                        s.status === "pending"
                          ? "bg-feedback-warning/10 text-feedback-warning"
                          : s.status === "approved"
                            ? "bg-feedback-success/10 text-feedback-success"
                            : "bg-feedback-destructive/10 text-feedback-destructive",
                      )}
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 hover:bg-surface-muted">
                      <Link to={`/admin/awards/suggestions/${s.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
