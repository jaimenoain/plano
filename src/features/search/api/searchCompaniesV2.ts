import { supabase } from "@/integrations/supabase/client";
import type { CompanySummary } from "@/features/credits/types";

export interface SearchCompaniesV2Options {
  limit?: number;
}

export async function searchCompaniesV2(
  query: string,
  opts: SearchCompaniesV2Options = {},
): Promise<CompanySummary[]> {
  const { limit = 10 } = opts;
  const q = query.trim();
  if (!q) return [];

  // Cast through unknown: search_companies_v2 not yet in generated types.
  const supabaseAny = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };
  const { data, error } = await supabaseAny.rpc("search_companies_v2", {
    p_query: q,
    p_limit: limit,
  });

  if (error) throw error;
  const rows = data as { id: string; name: string; slug: string; claim_status: string; country: string | null; logo_url: string | null; credit_count: number; rank_score: number }[] | null;
  if (!rows?.length) return [];

  return (rows as {
    id: string;
    name: string;
    slug: string;
    claim_status: CompanySummary["claimStatus"];
    country: string | null;
    logo_url: string | null;
    credit_count: number;
    rank_score: number;
  }[]).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    claimStatus: r.claim_status,
    country: r.country,
    logoUrl: r.logo_url,
    creditCount: r.credit_count,
  }));
}
