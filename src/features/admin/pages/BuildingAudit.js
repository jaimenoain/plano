import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
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
            if (error)
                throw error;
            return data;
        },
    });
    const [revertingId, setRevertingId] = useState(null);
    const handleRevert = async (logId) => {
        try {
            setRevertingId(logId);
            const { error } = await supabase.rpc("revert_building_change", {
                log_id: logId,
            });
            if (error)
                throw error;
            toast.success("Change reverted successfully");
            refetch();
        }
        catch (_error) {
            toast.error("Failed to revert change");
        }
        finally {
            setRevertingId(null);
        }
    };
    const renderDiff = (log) => {
        const oldD = log.old_data ?? {};
        const newD = log.new_data ?? {};
        if (log.table_name === 'buildings' && log.operation === 'UPDATE') {
            // Compare keys
            const keys = Array.from(new Set([...Object.keys(oldD), ...Object.keys(newD)]));
            const changes = keys.filter(k => JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]));
            return (_jsxs("div", { className: "text-xs space-y-1", children: [changes.slice(0, 5).map(k => (_jsxs("div", { children: [_jsxs("span", { className: "font-semibold", children: [k, ":"] }), " ", _jsx("span", { className: "text-red-500 line-through", children: String(oldD[k] ?? "").slice(0, 20) }), " -> ", _jsx("span", { className: "text-green-500", children: String(newD[k] ?? "").slice(0, 20) })] }, k))), changes.length > 5 && _jsxs("div", { children: ["...and ", changes.length - 5, " more"] })] }));
        }
        else if (log.table_name === 'building_styles') {
            return (_jsx("div", { className: "text-xs", children: log.operation === 'INSERT' ? (_jsxs("span", { className: "text-green-500", children: ["Added Style (ID: ", String(newD.style_id ?? "").slice(0, 8), ")"] })) : (_jsxs("span", { className: "text-red-500", children: ["Removed Style (ID: ", String(oldD.style_id ?? "").slice(0, 8), ")"] })) }));
        }
        return _jsxs("span", { className: "text-xs text-text-secondary", children: [log.operation, " on ", log.table_name] });
    };
    if (isLoading) {
        return (_jsx("div", { className: "flex h-[50vh] items-center justify-center", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin" }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-3xl font-bold tracking-tight", children: "Audit Logs" }), _jsx("p", { className: "text-text-secondary", children: "Track and revert changes made to buildings." })] }), _jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Date" }), _jsx(TableHead, { children: "User" }), _jsx(TableHead, { children: "Building" }), _jsx(TableHead, { children: "Change" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsxs(TableBody, { children: [logs?.map((log) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "whitespace-nowrap", children: format(new Date(log.created_at), "MMM d, HH:mm") }), _jsx(TableCell, { children: log.profiles?.username || "System" }), _jsx(TableCell, { children: log.buildings?.name || "Unknown" }), _jsx(TableCell, { className: "max-w-[300px]", children: renderDiff(log) }), _jsx(TableCell, { className: "text-right", children: _jsxs(Dialog, { children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: "sm", children: [_jsx(RotateCcw, { className: "mr-2 h-4 w-4" }), "Revert"] }) }), _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Confirm Revert" }), _jsx(DialogDescription, { children: "Are you sure you want to revert this change? This will restore the data to its previous state." })] }), _jsx("div", { className: "flex justify-end gap-2 mt-4", children: _jsxs(Button, { variant: "destructive", onClick: () => handleRevert(log.id), disabled: revertingId === log.id, children: [revertingId === log.id && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Confirm Revert"] }) })] })] }) })] }, log.id))), logs?.length === 0 && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center h-24 text-text-secondary", children: "No logs found." }) }))] })] }) })] }));
}
