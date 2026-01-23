import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Trash2, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  status: string | null;
  created_at: string;
  reporter?: { username: string | null } | null;
}

interface EnrichedReport extends Report {
  contentType: 'review' | 'comment' | 'unknown';
  contentSnippet?: string;
}

export default function Moderation() {
  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch reports
      const { data: rawReports, error } = await supabase
        .from("reports")
        .select(`*, reporter:profiles(username)`)
        .neq('status', 'resolved')
        .neq('status', 'dismissed')
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!rawReports || rawReports.length === 0) {
        setReports([]);
        return;
      }

      // Enrich with content
      const enriched = await Promise.all(rawReports.map(async (r: any) => {
        // Try Review
        const { data: review } = await supabase
            .from('user_buildings')
            .select('content')
            .eq('id', r.reported_id)
            .maybeSingle();

        if (review) {
            return { ...r, contentType: 'review', contentSnippet: review.content };
        }

        // Try Comment
        const { data: comment } = await supabase
            .from('comments')
            .select('content')
            .eq('id', r.reported_id)
            .maybeSingle();

        if (comment) {
            return { ...r, contentType: 'comment', contentSnippet: comment.content };
        }

        return { ...r, contentType: 'unknown', contentSnippet: 'Content not found or deleted' };
      }));

      setReports(enriched);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
        const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', id);
        if (error) throw error;
        setReports(prev => prev.filter(r => r.id !== id));
        toast.success("Report dismissed");
    } catch (error) {
        toast.error("Failed to dismiss report");
    }
  };

  const handleDeleteContent = async (report: EnrichedReport) => {
    if (!window.confirm("Are you sure? This will delete the content permanently.")) return;

    try {
        let deleteError = null;
        if (report.contentType === 'review') {
            const { error } = await supabase.from('user_buildings').delete().eq('id', report.reported_id);
            deleteError = error;
        } else if (report.contentType === 'comment') {
            const { error } = await supabase.from('comments').delete().eq('id', report.reported_id);
            deleteError = error;
        }

        if (deleteError) throw deleteError;

        // Mark report resolved
        const { error: resolveError } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
        if (resolveError) throw resolveError;

        setReports(prev => prev.filter(r => r.id !== report.id));
        toast.success("Content deleted and report resolved");

    } catch (error) {
        console.error(error);
        toast.error("Failed to delete content");
    }
  };

  return (
    <div className="space-y-6 p-6">
       <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Moderation Queue</h1>
       </div>

       <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Content Snippet</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {loading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                </TableRow>
             ) : reports.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        All caught up! No pending reports.
                    </TableCell>
                </TableRow>
             ) : (
                reports.map(report => (
                    <TableRow key={report.id}>
                        <TableCell>
                            <Badge variant="outline">{report.contentType}</Badge>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{report.reason}</div>
                            {report.details && <div className="text-xs text-muted-foreground">{report.details}</div>}
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                            {report.contentSnippet || <span className="text-muted-foreground italic">No content</span>}
                        </TableCell>
                        <TableCell>
                            {report.reporter?.username || report.reporter_id}
                        </TableCell>
                        <TableCell>
                             {format(new Date(report.created_at), "MMM d")}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => handleDismiss(report.id)}>
                                    <CheckCircle className="h-4 w-4 mr-1" /> Dismiss
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteContent(report)} disabled={report.contentType === 'unknown'}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                </Button>
                            </div>
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
