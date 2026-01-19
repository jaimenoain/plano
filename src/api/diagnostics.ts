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
    const { error } = await supabase.from('admin_diagnostic_logs').insert({
      error_type: errorType,
      message: message,
      stack_trace: stackTrace,
      user_agent: navigator.userAgent,
      url: window.location.href,
      user_id: (await supabase.auth.getUser()).data.user?.id
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
    .from('admin_diagnostic_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch diagnostic logs:', error);
    throw error;
  }

  return data;
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
