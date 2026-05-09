import { supabase } from "@/integrations/supabase/client";
import type { PersonSummary } from "@/features/credits/types";

export interface SearchPeopleV2Options {
  limit?: number;
}

export async function searchPeopleV2(
  query: string,
  opts: SearchPeopleV2Options = {},
): Promise<PersonSummary[]> {
  const { limit = 10 } = opts;
  const q = query.trim();
  if (!q) return [];

  // Cast through unknown: search_people_v2 not yet in generated types.
  const supabaseAny = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };
  const { data, error } = await supabaseAny.rpc("search_people_v2", {
    p_query: q,
    p_limit: limit,
  });

  if (error) throw error;
  const rows = data as { id: string; name: string; slug: string; claim_status: string; nationality: string | null; avatar_url: string | null; credit_count: number; rank_score: number }[] | null;
  if (!rows?.length) return [];

  return (rows as {
    id: string;
    name: string;
    slug: string;
    claim_status: PersonSummary["claimStatus"];
    nationality: string | null;
    avatar_url: string | null;
    credit_count: number;
    rank_score: number;
  }[]).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    claimStatus: r.claim_status,
    associatedCompanies: [],
    knownBuilding: null,
    nationality: r.nationality,
    avatarUrl: r.avatar_url,
    creditCount: r.credit_count,
  }));
}
