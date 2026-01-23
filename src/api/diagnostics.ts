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
          user_agent: navigator.userAgent,
          url: window.location.href
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

  return data.map((log: any) => ({
      id: log.id,
      created_at: log.created_at,
      error_type: log.details?.error_type || 'Unknown',
      message: log.details?.message || 'No message',
      stack_trace: log.details?.stack_trace || null,
      user_agent: log.details?.user_agent || null,
      url: log.details?.url || null,
      user_id: log.admin_id
  }));
}

export async function fetchIncompleteSessions(): Promise<IncompleteSession[]> {
  // Fetch sessions that are published, in the past, and NOT effectively completed
  // Note: The strict "completed" logic is complex (requires checking logs, comments, likes)
  // Here we just fetch published past sessions and we can filter or display them.
  // Ideally, we would use an RPC, but for now we'll fetch potentially incomplete sessions
  // and maybe do a lightweight check or just list them for manual inspection.

  // Fetch sessions from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('group_sessions')
    .select(`
      id,
      session_date,
      status,
      group_id,
      groups (
        name
      )
    `)
    .eq('status', 'published')
    .lt('session_date', new Date().toISOString())
    .gte('session_date', thirtyDaysAgo.toISOString())
    .order('session_date', { ascending: false });

  if (error) {
    console.error('Failed to fetch sessions:', error);
    throw error;
  }

  // Transform to flat structure
  return data.map((item: any) => ({
    id: item.id,
    session_date: item.session_date,
    status: item.status,
    group_id: item.group_id,
    group_name: item.groups?.name
  }));
}
