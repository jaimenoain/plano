import { useSuggestions } from "@/features/awards/hooks/useAwards";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AwardSuggestions() {
  const { data: suggestions = [], isLoading } = useSuggestions();

  if (isLoading) {
    return <div className="p-8 text-center text-secondary">Loading suggestions...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Award Suggestions</h1>
          <p className="text-secondary">Review community-submitted award recipients.</p>
        </div>
      </div>

      <div className="border border-border-default rounded-sm overflow-hidden bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/50 hover:bg-surface-muted/50 border-border-default">
              <TableHead className="w-[180px]">Submitted By</TableHead>
              <TableHead>Award / Year</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-secondary">
                  No suggestions found.
                </TableCell>
              </TableRow>
            ) : (
              suggestions.map((s) => (
                <TableRow key={s.id} className="border-border-default hover:bg-surface-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{s.submittedByProfile?.name || "Anonymous"}</span>
                      <span className="text-[10px] text-secondary">{format(new Date(s.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{s.award?.name}</span>
                      <span className="text-xs text-secondary">{s.year}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {s.recipientType === 'building' ? s.building?.name : 
                         s.recipientType === 'person' ? s.person?.name : 
                         s.company?.name}
                      </span>
                      <span className="text-[10px] text-secondary uppercase tracking-widest">{s.recipientType}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-none border-border-default capitalize text-[10px]">
                      {s.outcome.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "rounded-none text-[10px] uppercase tracking-widest",
                        s.status === 'pending' ? "bg-amber-100 text-amber-900" :
                        s.status === 'approved' ? "bg-emerald-100 text-emerald-900" :
                        "bg-red-100 text-red-900"
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
