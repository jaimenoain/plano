import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, RefreshCcw, Activity, FileWarning, Terminal } from "lucide-react";
import { fetchDiagnosticLogs, fetchIncompleteSessions, logDiagnosticError, DiagnosticLog, IncompleteSession } from "@/api/diagnostics";
import { supabase } from "@/integrations/supabase/client";

export function SessionDiagnosticZone() {
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [sessions, setSessions] = useState<IncompleteSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'failure' | null, message: string }>({ status: null, message: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, sessionsData] = await Promise.all([
        fetchDiagnosticLogs(),
        fetchIncompleteSessions()
      ]);
      setLogs(logsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error("Failed to load diagnostic data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runTestMode = async () => {
    setTestResult({ status: null, message: 'Running diagnostics...' });
    try {
      // Check 1: Navigator
      if (!navigator.onLine) throw new Error("Browser is offline");

      // Check 2: Supabase Connection
      const { error: dbError } = await supabase.from('profiles').select('count').limit(1).single();
      if (dbError) throw new Error(`Supabase connection failed: ${dbError.message}`);

      // Check 3: Log write access
      await logDiagnosticError('Diagnostic Test', 'Manual test triggered from Admin Dashboard');

      setTestResult({ status: 'success', message: 'All systems operational. Test log sent.' });
      loadData(); // Reload to show the new log
    } catch (e: any) {
      setTestResult({ status: 'failure', message: e.message || 'Unknown error' });
      await logDiagnosticError('Diagnostic Test Failure', e.message || 'Unknown error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Session Diagnostics & Health</h2>
          <p className="text-sm text-muted-foreground">Real-time monitoring and investigation tools.</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Card 1: System Health & Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Check
            </CardTitle>
            <CardDescription>Verify tracking and connection status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">Tracking Validation</span>
              <Button onClick={runTestMode} size="sm" variant={testResult.status === 'success' ? 'default' : testResult.status === 'failure' ? 'destructive' : 'secondary'}>
                {testResult.status === 'success' ? <CheckCircle className="mr-2 h-4 w-4" /> : testResult.status === 'failure' ? <AlertTriangle className="mr-2 h-4 w-4" /> : <Terminal className="mr-2 h-4 w-4" />}
                {testResult.status === 'success' ? 'Passed' : testResult.status === 'failure' ? 'Failed' : 'Run Test'}
              </Button>
            </div>
            {testResult.message && (
              <div className={`text-sm p-2 rounded ${testResult.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {testResult.message}
              </div>
            )}
             <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Trigger Definition Audit</h4>
                <div className="text-xs bg-muted p-3 rounded-md font-mono">
                  Completed = (Status is 'published' AND Date &lt; NOW()) AND (<br/>
                  &nbsp;&nbsp;EXISTS(session_comments) OR<br/>
                  &nbsp;&nbsp;EXISTS(session_likes) OR<br/>
                  &nbsp;&nbsp;EXISTS(logs in group within 48h)<br/>
                  )
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Card 2: Recent Incomplete Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5" />
              Recent Incomplete Sessions
            </CardTitle>
            <CardDescription>Published sessions with no detected completion activity.</CardDescription>
          </CardHeader>
          <CardContent>
             <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length > 0 ? sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="text-xs">{new Date(session.session_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs font-medium">{session.group_name || 'Unknown'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{session.status}</Badge></TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">No incomplete sessions found (or loading...)</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Full Width: Error Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Diagnostic Logs
          </CardTitle>
          <CardDescription>Real-time capture of client-side errors and warnings.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Time</TableHead>
                  <TableHead className="w-[150px]">Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[100px]">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{log.error_type}</TableCell>
                    <TableCell className="text-xs font-mono break-all">{log.message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.user_id ? 'Auth' : 'Anon'}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No logs found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
