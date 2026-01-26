import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function BuildingAudit() {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["building_audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_audit_logs")
        .select(`
          *,
          buildings (name),
          profiles (username)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const [revertingId, setRevertingId] = useState<string | null>(null);

  const handleRevert = async (logId: string) => {
    try {
      setRevertingId(logId);
      const { error } = await supabase.rpc("revert_building_change", {
        log_id: logId,
      });

      if (error) throw error;

      toast.success("Change reverted successfully");
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Failed to revert change");
    } finally {
      setRevertingId(null);
    }
  };

  const renderDiff = (log: any) => {
      const oldD = log.old_data || {};
      const newD = log.new_data || {};

      if (log.table_name === 'buildings' && log.operation === 'UPDATE') {
          // Compare keys
          const keys = Array.from(new Set([...Object.keys(oldD), ...Object.keys(newD)]));
          const changes = keys.filter(k => JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]));

          return (
              <div className="text-xs space-y-1">
                  {changes.slice(0, 5).map(k => (
                      <div key={k}>
                          <span className="font-semibold">{k}:</span>{" "}
                          <span className="text-red-500 line-through">{String(oldD[k]).slice(0, 20)}</span>
                          {" -> "}
                          <span className="text-green-500">{String(newD[k]).slice(0, 20)}</span>
                      </div>
                  ))}
                  {changes.length > 5 && <div>...and {changes.length - 5} more</div>}
              </div>
          );
      } else if (log.table_name === 'building_styles') {
          return (
              <div className="text-xs">
                  {log.operation === 'INSERT' ? (
                      <span className="text-green-500">Added Style (ID: {newD.style_id?.slice(0,8)})</span>
                  ) : (
                      <span className="text-red-500">Removed Style (ID: {oldD.style_id?.slice(0,8)})</span>
                  )}
              </div>
          )
      }
      return <span className="text-xs text-muted-foreground">{log.operation} on {log.table_name}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          Track and revert changes made to buildings.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Change</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(log.created_at), "MMM d, HH:mm")}
                </TableCell>
                <TableCell>
                  {log.profiles?.username || "System"}
                </TableCell>
                <TableCell>
                    {/* @ts-ignore */}
                  {log.buildings?.name || "Unknown"}
                </TableCell>
                <TableCell className="max-w-[300px]">
                    {renderDiff(log)}
                </TableCell>
                <TableCell className="text-right">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Revert
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirm Revert</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to revert this change?
                                    This will restore the data to its previous state.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button
                                    variant="destructive"
                                    onClick={() => handleRevert(log.id)}
                                    disabled={revertingId === log.id}
                                >
                                    {revertingId === log.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Revert
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </TableCell>
              </TableRow>
            ))}
            {logs?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No logs found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
