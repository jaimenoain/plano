import { supabase } from "@/integrations/supabase/client";
export async function logDiagnosticError(errorType, message, stackTrace) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        // admin_audit_logs requires admin_id (user_id) to be NOT NULL.
        // We can only log if we have a user.
        if (!user) {
            console.warn('Cannot log diagnostic error without authenticated user (admin_audit_logs constraint).');
            return;
        }
        const { error } = await supabase.from('admin_audit_logs').insert({
            admin_id: user.id,
            action_type: 'DIAGNOSTIC_ERROR',
            target_type: 'SYSTEM',
            target_id: 'SYSTEM',
            details: {
                error_type: errorType,
                message: message,
                stack_trace: stackTrace,
                user_agent: navigator.userAgent,
                url: window.location.href
            }
        });
        if (error) {
            console.error('Failed to send diagnostic log:', error);
        }
    }
    catch (e) {
        console.error('Exception sending diagnostic log:', e);
    }
}
export async function fetchDiagnosticLogs() {
    const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('action_type', 'DIAGNOSTIC_ERROR')
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) {
        console.error('Failed to fetch diagnostic logs:', error);
        throw error;
    }
    return (data ?? []).map((log) => ({
        id: log.id,
        created_at: log.created_at,
        error_type: log.details?.error_type || 'Unknown',
        message: log.details?.message || 'No message',
        stack_trace: log.details?.stack_trace || null,
        user_agent: log.details?.user_agent || null,
        url: log.details?.url || null,
        user_id: log.admin_id ?? null
    }));
}
export async function fetchIncompleteSessions() {
    // Group sessions / field-trip tables were removed (Phase 7–11). Admin UI keeps the
    // diagnostics card but there is no backing query anymore.
    return [];
}
