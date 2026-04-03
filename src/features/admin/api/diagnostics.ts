import { supabase } from "@/integrations/supabase/client";

export interface DiagnosticLog {
  id: string;
  created_at: string;
  error_type: string;
  message: string;
  stack_trace: string | null;
  user_agent: string | null;
  url: string | null;
  user_id: string | null;
}

export interface IncompleteSession {
  id: string;
  session_date: string;
  status: string;
  group_id: string;
  group_name?: string;
}

export async function logDiagnosticError(
  errorType: string,
  message: string,
  stackTrace?: string
) {
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
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
          url:
            typeof window !== "undefined" ? window.location.href : null,
      }
    });

    if (error) {
      console.error('Failed to send diagnostic log:', error);
    }
  } catch (e) {
    console.error('Exception sending diagnostic log:', e);
  }
}

export async function fetchDiagnosticLogs(): Promise<DiagnosticLog[]> {
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

  return (data ?? []).map((log) => {
    const details =
      log.details && typeof log.details === "object" && !Array.isArray(log.details)
        ? (log.details as Record<string, unknown>)
        : null;
    return {
      id: log.id,
      created_at: log.created_at,
      error_type: (details?.error_type as string | undefined) || "Unknown",
      message: (details?.message as string | undefined) || "No message",
      stack_trace: (details?.stack_trace as string | null | undefined) ?? null,
      user_agent: (details?.user_agent as string | null | undefined) ?? null,
      url: (details?.url as string | null | undefined) ?? null,
      user_id: log.admin_id ?? null,
    };
  });
}

export async function fetchIncompleteSessions(): Promise<IncompleteSession[]> {
  // Group sessions / field-trip tables were removed (Phase 7–11). Admin UI keeps the
  // diagnostics card but there is no backing query anymore.
  return [];
}
