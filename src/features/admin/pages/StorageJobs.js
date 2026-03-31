import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
export default function StorageJobs() {
    const [jobs, setJobs] = useState([]);
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
            if (error)
                throw error;
            setJobs(data);
        }
        catch (_error) {
            toast.error("Failed to load jobs");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchJobs();
        // Subscribe to changes
        const channel = supabase
            .channel('deletion_jobs_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'deletion_jobs' }, (_payload) => {
            fetchJobs(); // Simple refresh on any change
        })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
    const handleQueueDeletion = async (e) => {
        e.preventDefault();
        if (!userIdInput)
            return;
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
            if (error)
                throw error;
            toast.success("Deletion job queued successfully");
            setUserIdInput("");
            fetchJobs();
        }
        catch (error) {
            toast.error(`Failed to queue job: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        finally {
            setSubmitting(false);
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'default'; // primary/black
            case 'processing': return 'secondary'; // gray/blueish
            case 'failed': return 'destructive';
            case 'pending': return 'outline';
            default: return 'outline';
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6 pb-20", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("h1", { className: "text-3xl font-bold tracking-tight", children: "Storage Management" }), _jsx("p", { className: "text-text-secondary", children: "Manage background jobs for recursive storage deletion." })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Queue New Deletion" }), _jsx(CardDescription, { children: "Enter a User ID to asynchronously delete all their files from storage. This process runs in the background." })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: handleQueueDeletion, className: "flex gap-4 items-end", children: [_jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("label", { htmlFor: "userId", className: "text-sm font-medium", children: "User ID (UUID)" }), _jsx(Input, { id: "userId", placeholder: "e.g. a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", value: userIdInput, onChange: (e) => setUserIdInput(e.target.value), required: true })] }), _jsxs(Button, { type: "submit", disabled: submitting, variant: "destructive", children: [submitting ? _jsx(Loader2, { className: "w-4 h-4 animate-spin mr-2" }) : _jsx(Trash2, { className: "w-4 h-4 mr-2" }), "Queue Deletion"] })] }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Job History" }), _jsxs(Button, { variant: "ghost", size: "sm", onClick: fetchJobs, children: [_jsx(RefreshCw, { className: "w-4 h-4 mr-2" }), "Refresh"] })] }), _jsx("div", { className: "rounded-md border bg-surface-card", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "User ID" }), _jsx(TableHead, { children: "Bucket" }), _jsx(TableHead, { children: "Created" }), _jsx(TableHead, { children: "Updated" }), _jsx(TableHead, { children: "Last Log" })] }) }), _jsx(TableBody, { children: loading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "h-24 text-center", children: _jsx(Loader2, { className: "w-6 h-6 animate-spin mx-auto" }) }) })) : jobs.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "h-24 text-center text-text-secondary", children: "No jobs found." }) })) : (jobs.map((job) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsx(Badge, { variant: getStatusColor(job.status), children: job.status.toUpperCase() }) }), _jsx(TableCell, { className: "font-mono text-xs", children: job.user_id }), _jsx(TableCell, { className: "text-sm", children: job.bucket_name }), _jsx(TableCell, { className: "text-sm text-text-secondary", children: format(new Date(job.created_at), "MMM d, HH:mm") }), _jsx(TableCell, { className: "text-sm text-text-secondary", children: format(new Date(job.updated_at), "HH:mm:ss") }), _jsx(TableCell, { className: "max-w-[200px] truncate text-xs text-text-secondary", children: job.logs && job.logs.length > 0 ? job.logs[job.logs.length - 1] : '-' })] }, job.id)))) })] }) })] })] }));
}
