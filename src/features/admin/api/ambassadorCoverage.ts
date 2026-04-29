import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AdminAmbassadorLocalityCoverageRow =
  Database["public"]["Functions"]["get_admin_ambassador_locality_coverage"]["Returns"][number];

export type AdminAmbassadorProgramStatsRow =
  Database["public"]["Functions"]["get_admin_ambassador_program_stats"]["Returns"][number];

export async function fetchAdminAmbassadorLocalityCoverage(): Promise<AdminAmbassadorLocalityCoverageRow[]> {
  const { data, error } = await supabase.rpc("get_admin_ambassador_locality_coverage");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdminAmbassadorProgramStats(): Promise<AdminAmbassadorProgramStatsRow | null> {
  const { data, error } = await supabase.rpc("get_admin_ambassador_program_stats");
  if (error) throw error;
  return data?.[0] ?? null;
}
