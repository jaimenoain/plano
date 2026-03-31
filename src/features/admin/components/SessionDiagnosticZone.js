import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, RefreshCcw, Activity, FileWarning, Terminal } from "lucide-react";
import { fetchDiagnosticLogs, fetchIncompleteSessions, logDiagnosticError } from "@/features/admin/api/diagnostics";
import { supabase } from "@/integrations/supabase/client";
export function SessionDiagnosticZone() {
    const [logs, setLogs] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState({ status: null, message: '' });
    const loadData = async () => {
        setLoading(true);
        try {
            const [logsData, sessionsData] = await Promise.all([
                fetchDiagnosticLogs(),
                fetchIncompleteSessions()
            ]);
            setLogs(logsData);
            setSessions(sessionsData);
        }
        catch (_error) {
        }
        finally {
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
            if (!navigator.onLine)
                throw new Error("Browser is offline");
            // Check 2: Supabase Connection
            const { error: dbError } = await supabase.from('profiles').select('id').limit(1).single();
            if (dbError)
                throw new Error(`Supabase connection failed: ${dbError.message}`);
            // Check 3: Log write access
            await logDiagnosticError('Diagnostic Test', 'Manual test triggered from Admin Dashboard');
            setTestResult({ status: 'success', message: 'All systems operational. Test log sent.' });
            loadData(); // Reload to show the new log
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            setTestResult({ status: 'failure', message: msg });
            await logDiagnosticError('Diagnostic Test Failure', msg);
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Field Trip Diagnostics & Health" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Real-time monitoring and investigation tools." })] }), _jsxs(Button, { onClick: loadData, variant: "outline", size: "sm", disabled: loading, children: [_jsx(RefreshCcw, { className: `mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}` }), "Refresh"] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Activity, { className: "h-5 w-5" }), "System Health Check"] }), _jsx(CardDescription, { children: "Verify tracking and connection status." })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border rounded-lg", children: [_jsx("span", { className: "text-sm font-medium", children: "Tracking Validation" }), _jsxs(Button, { onClick: runTestMode, size: "sm", variant: testResult.status === 'success' ? 'default' : testResult.status === 'failure' ? 'destructive' : 'secondary', children: [testResult.status === 'success' ? _jsx(CheckCircle, { className: "mr-2 h-4 w-4" }) : testResult.status === 'failure' ? _jsx(AlertTriangle, { className: "mr-2 h-4 w-4" }) : _jsx(Terminal, { className: "mr-2 h-4 w-4" }), testResult.status === 'success' ? 'Passed' : testResult.status === 'failure' ? 'Failed' : 'Run Test'] })] }), testResult.message && (_jsx("div", { className: `text-sm p-2 rounded ${testResult.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`, children: testResult.message })), _jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-xs font-semibold uppercase text-text-secondary", children: "Notes" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Group field-trip session tables were removed. Incomplete-trip listings are disabled until a new data source is wired." })] })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(FileWarning, { className: "h-5 w-5" }), "Recent Incomplete Trips"] }), _jsx(CardDescription, { children: "Legacy group trip data is no longer available." })] }), _jsx(CardContent, { children: _jsx("p", { className: "text-sm text-text-secondary", children: sessions.length === 0
                                        ? "No trip-completion backlog is shown. This section is reserved for a future replacement metric."
                                        : `${sessions.length} item(s) loaded.` }) })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Terminal, { className: "h-5 w-5" }), "Diagnostic Logs"] }), _jsx(CardDescription, { children: "Real-time capture of client-side errors and warnings." })] }), _jsx(CardContent, { children: _jsx(ScrollArea, { className: "h-[300px]", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "w-[150px]", children: "Time" }), _jsx(TableHead, { className: "w-[150px]", children: "Type" }), _jsx(TableHead, { children: "Message" }), _jsx(TableHead, { className: "w-[100px]", children: "User" })] }) }), _jsx(TableBody, { children: logs.length > 0 ? logs.map((log) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "text-xs text-text-secondary", children: new Date(log.created_at).toLocaleString() }), _jsx(TableCell, { className: "text-xs font-medium", children: log.error_type }), _jsx(TableCell, { className: "text-xs font-mono break-all", children: log.message }), _jsx(TableCell, { className: "text-xs text-text-secondary", children: log.user_id ? 'Auth' : 'Anon' })] }, log.id))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, className: "text-center text-text-secondary", children: "No logs found." }) })) })] }) }) })] })] }));
}
