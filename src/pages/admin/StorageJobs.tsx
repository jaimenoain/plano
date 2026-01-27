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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Trash2, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DeletionJob {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  logs: string[] | null;
  bucket_name: string;
}

export default function StorageJobs() {
  const [jobs, setJobs] = useState<DeletionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [userIdInput, setUserIdInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deletion_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data as unknown as DeletionJob[]);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Subscribe to changes
    const channel = supabase
      .channel('deletion_jobs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deletion_jobs' },
        (payload) => {
           console.log('Change received!', payload);
           fetchJobs(); // Simple refresh on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleQueueDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdInput) return;

    // Basic validation for UUID?
    // Let's allow loose string but maybe warn if not UUID-like.
    // For now, trust admin.

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('deletion_jobs')
        .insert({
          user_id: userIdInput,
          bucket_name: 'review_images', // Default for now
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Deletion job queued successfully");
      setUserIdInput("");
      fetchJobs();
    } catch (error: any) {
      console.error("Error creating job:", error);
      toast.error(`Failed to queue job: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default'; // primary/black
      case 'processing': return 'secondary'; // gray/blueish
      case 'failed': return 'destructive';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Storage Management</h1>
        <p className="text-muted-foreground">
          Manage background jobs for recursive storage deletion.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue New Deletion</CardTitle>
          <CardDescription>
            Enter a User ID to asynchronously delete all their files from storage.
            This process runs in the background.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQueueDeletion} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label htmlFor="userId" className="text-sm font-medium">
                User ID (UUID)
              </label>
              <Input
                id="userId"
                placeholder="e.g. a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting} variant="destructive">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Queue Deletion
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Job History</h2>
          <Button variant="ghost" size="sm" onClick={fetchJobs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Last Log</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Badge variant={getStatusColor(job.status) as any}>
                        {job.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{job.user_id}</TableCell>
                    <TableCell className="text-sm">{job.bucket_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(job.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(job.updated_at), "HH:mm:ss")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {job.logs && job.logs.length > 0 ? job.logs[job.logs.length - 1] : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
