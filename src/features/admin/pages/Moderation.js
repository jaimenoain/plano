import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
export default function Moderation() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentAdminId, setCurrentAdminId] = useState(null);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentAdminId(data.user?.id || null);
        });
        fetchReports();
    }, []);
    const fetchReports = async () => {
        setLoading(true);
        try {
            // Fetch reports
            const { data: rawReports, error } = await supabase
                .from("reports")
                .select(`*, reporter:profiles!reporter_id(username)`)
                .neq('status', 'resolved')
                .neq('status', 'dismissed')
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            if (!rawReports || rawReports.length === 0) {
                setReports([]);
                return;
            }
            // Enrich with content
            const enriched = await Promise.all(rawReports.map(async (r) => {
                // Try Review
                const { data: review } = await supabase
                    .from('user_buildings')
                    .select('content')
                    .eq('id', r.reported_id)
                    .maybeSingle();
                if (review) {
                    return { ...r, contentType: 'review', contentSnippet: review.content ?? undefined };
                }
                // Try Comment
                const { data: comment } = await supabase
                    .from('comments')
                    .select('content')
                    .eq('id', r.reported_id)
                    .maybeSingle();
                if (comment) {
                    return { ...r, contentType: 'comment', contentSnippet: comment.content ?? undefined };
                }
                return {
                    ...r,
                    contentType: 'unknown',
                    contentSnippet: 'Content not found or deleted',
                };
            }));
            setReports(enriched);
        }
        catch (_error) {
            toast.error("Failed to load reports");
        }
        finally {
            setLoading(false);
        }
    };
    const handleDismiss = async (report) => {
        if (!currentAdminId)
            return;
        try {
            // Dismiss ALL reports for this content to clear queue
            const { error } = await supabase
                .from('reports')
                .update({ status: 'dismissed' })
                .eq('reported_id', report.reported_id);
            if (error)
                throw error;
            // Log audit
            await supabase.from('admin_audit_logs').insert({
                admin_id: currentAdminId,
                action_type: 'dismiss_report',
                target_type: report.contentType,
                target_id: report.reported_id,
                details: { reason: report.reason, original_report_id: report.id }
            });
            setReports(prev => prev.filter(r => r.reported_id !== report.reported_id));
            toast.success("Reports dismissed");
        }
        catch (_error) {
            toast.error("Failed to dismiss report");
        }
    };
    const handleDeleteContent = async (report) => {
        if (!currentAdminId)
            return;
        if (!window.confirm("Are you sure? This will delete the content permanently."))
            return;
        try {
            let deleteError = null;
            if (report.contentType === 'review') {
                const { error } = await supabase.from('user_buildings').delete().eq('id', report.reported_id);
                deleteError = error;
            }
            else if (report.contentType === 'comment') {
                const { error } = await supabase.from('comments').delete().eq('id', report.reported_id);
                deleteError = error;
            }
            if (deleteError)
                throw deleteError;
            // Mark ALL reports resolved
            const { error: resolveError } = await supabase
                .from('reports')
                .update({ status: 'resolved' })
                .eq('reported_id', report.reported_id);
            if (resolveError)
                throw resolveError;
            // Log audit
            await supabase.from('admin_audit_logs').insert({
                admin_id: currentAdminId,
                action_type: 'delete_content',
                target_type: report.contentType,
                target_id: report.reported_id,
                details: { reason: report.reason, original_report_id: report.id }
            });
            setReports(prev => prev.filter(r => r.reported_id !== report.reported_id));
            toast.success("Content deleted and reports resolved");
        }
        catch (_error) {
            toast.error("Failed to delete content");
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Moderation Queue" }) }), _jsx("div", { className: "rounded-md border bg-surface-card", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Type" }), _jsx(TableHead, { children: "Reason" }), _jsx(TableHead, { children: "Content Snippet" }), _jsx(TableHead, { children: "Reporter" }), _jsx(TableHead, { children: "Date" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: loading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "h-24 text-center", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin mx-auto" }) }) })) : reports.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "h-24 text-center text-text-secondary", children: "All caught up! No pending reports." }) })) : (reports.map(report => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsx(Badge, { variant: "outline", children: report.contentType }) }), _jsxs(TableCell, { children: [_jsx("div", { className: "font-medium", children: report.reason }), report.details && _jsx("div", { className: "text-xs text-text-secondary", children: report.details })] }), _jsx(TableCell, { className: "max-w-md truncate", children: report.contentSnippet || _jsx("span", { className: "text-text-secondary italic", children: "No content" }) }), _jsx(TableCell, { children: report.reporter?.username || report.reporter_id }), _jsx(TableCell, { children: format(new Date(report.created_at), "MMM d") }), _jsx(TableCell, { className: "text-right", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsxs(Button, { size: "sm", variant: "ghost", onClick: () => handleDismiss(report), children: [_jsx(CheckCircle, { className: "h-4 w-4 mr-1" }), " Dismiss"] }), _jsxs(Button, { size: "sm", variant: "destructive", onClick: () => handleDeleteContent(report), disabled: report.contentType === 'unknown', children: [_jsx(Trash2, { className: "h-4 w-4 mr-1" }), " Delete"] })] }) })] }, report.id)))) })] }) })] }));
}
